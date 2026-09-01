// app/api/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { ModelMetrics, ApiResponse } from '@/types/Database.types';

const VALID_MODEL_NAMES = ['customer_churn', 'session_conversion'];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const modelName = searchParams.get('model_name');
  const championOnly = searchParams.get('champion_only') === 'true';

  if (modelName && !VALID_MODEL_NAMES.includes(modelName)) {
    const body: ApiResponse<null> = {
      data: null,
      error: `model_name tidak valid. Pilihan: ${VALID_MODEL_NAMES.join(', ')}`,
    };
    return NextResponse.json(body, { status: 400 });
  }

  let query = supabaseAdmin
    .from('model_metrics')
    .select('*')
    .order('trained_at', { ascending: false });

  if (modelName) {
    query = query.eq('model_name', modelName);
  }
  if (championOnly) {
    query = query.eq('is_champion', true);
  }

  const { data, error } = await query;

  if (error) {
    const body: ApiResponse<null> = { data: null, error: error.message };
    return NextResponse.json(body, { status: 500 });
  }

  const body: ApiResponse<ModelMetrics[]> = { data, error: null };
  return NextResponse.json(body);
}