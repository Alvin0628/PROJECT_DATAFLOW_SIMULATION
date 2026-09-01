// app/api/admin/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ApiResponse } from "@/types/Database.types";

// PENTING: endpoint ini MENGHAPUS SELURUH DATA. Tanpa proteksi, siapapun
// yang tau URL-nya (termasuk crawler/bot yang scan endpoint umum seperti
// /api/admin/*) bisa wipe database kamu begitu ini live di Vercel.
//
// Proteksi: butuh header `x-admin-secret` yang cocok dengan env var
// ADMIN_RESET_SECRET (JANGAN pakai prefix NEXT_PUBLIC_ -- ini harus
// tetap rahasia, hanya ada di server Vercel, tidak pernah ke browser).
//
// Generate secret-nya sendiri, misal: openssl rand -hex 32
// Set di Vercel: Project Settings -> Environment Variables -> ADMIN_RESET_SECRET

const TABLES_TO_RESET = [
  "predictions",
  "prediction_reconciliation",
  "model_metrics",
  "pipeline_health",
] as const; 

export async function POST(request: NextRequest) {
  const providedSecret = request.headers.get("x-admin-secret");
  const expectedSecret = process.env.ADMIN_RESET_SECRET;

  if (!expectedSecret) {
    // Kalau env var belum di-set sama sekali, TOLAK by default (fail-closed),
    // jangan biarkan reset jalan tanpa proteksi cuma karena lupa konfigurasi.
    const body: ApiResponse<null> = {
      data: null,
      error: "ADMIN_RESET_SECRET belum dikonfigurasi di server.",
    };
    return NextResponse.json(body, { status: 500 });
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    const body: ApiResponse<null> = { data: null, error: "Unauthorized." };
    return NextResponse.json(body, { status: 401 });
  }

  const results: Record<string, string> = {};

  for (const table of TABLES_TO_RESET) {
    // `.neq('id', 0)` adalah trik umum Supabase untuk delete SEMUA baris --
    // Supabase mewajibkan filter WHERE pada DELETE, tidak bisa delete
    // tanpa kondisi sama sekali sebagai pengaman tambahan dari mereka.
    const { error } = await supabaseAdmin.from(table).delete().neq("id", 0);
    results[table] = error ? `ERROR: ${error.message}` : "cleared";
  }

  const body: ApiResponse<typeof results> = { data: results, error: null };
  return NextResponse.json(body);
}
