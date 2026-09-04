// app/api/admin/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ApiResponse } from "@/types/Database.types";

// Protected by ADMIN_RESET_SECRET (server-only).
// Generate: openssl rand -hex 32


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
    const { error } = await supabaseAdmin.from(table).delete().neq("id", 0);
    results[table] = error ? `ERROR: ${error.message}` : "cleared";
  }

  const body: ApiResponse<typeof results> = { data: results, error: null };
  return NextResponse.json(body);
}
