import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Prediction, ApiResponse } from '@/types/Database.types';

const VALID_MODEL_NAMES = ['customer_churn', 'session_conversion'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500; // Kita naikkan agar bisa export banyak baris sekaligus

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const modelName = searchParams.get('model_name');
  const batchNumber = searchParams.get('batch_number');
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');
  const entityId = searchParams.get('entity_id');
  
  // [FITUR BARU]: Tangkap filter label (1 atau 0)
  const predictedLabel = searchParams.get('predicted_label'); 

  if (!modelName || !VALID_MODEL_NAMES.includes(modelName)) {
    return NextResponse.json({ data: null, error: `Parameter 'model_name' tidak valid.` }, { status: 400 });
  }

  let limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0;

  // 1. Inisiasi Kueri
  let query = supabaseAdmin
    .from('predictions')
    .select('*')
    .eq('model_name', modelName)
    .order('probability', { ascending: false });

  // 2. Tumpuk Filter: Jika ada pencarian Entity
  if (entityId) {
    query = query.ilike('entity_id', `%${entityId}%`);
  }

  // 3. Tumpuk Filter: Jika mencari Batch tertentu
  if (batchNumber) {
    const parsedBatch = parseInt(batchNumber, 10);
    if (!isNaN(parsedBatch)) {
      query = query.eq('batch_number', parsedBatch);
    }
  }

  // 4. Tumpuk Filter: Jika memfilter Action/Safe
  if (predictedLabel !== null && predictedLabel !== '') {
    query = query.eq('predicted_label', parseInt(predictedLabel, 10));
  }

  // 5. Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  return NextResponse.json({ data, error: null });
}