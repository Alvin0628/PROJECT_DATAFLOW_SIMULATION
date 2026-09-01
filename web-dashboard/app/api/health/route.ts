// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { PipelineHealth, ApiResponse } from '@/types/Database.types';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('pipeline_health')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    const body: ApiResponse<null> = { data: null, error: error.message };
    return NextResponse.json(body, { status: 500 });
  }

  const body: ApiResponse<PipelineHealth[]> = { data, error: null };
  return NextResponse.json(body);
}