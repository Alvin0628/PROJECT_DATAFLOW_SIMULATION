import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Keep the dashboard renderable in preview mode when no integration is configured.
// API requests will return a structured connection error instead of crashing at import time.

export const supabaseAdmin = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseServiceRoleKey || "preview-no-service-role-key",
  {
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(60_000),
        });
      },
    },
  },
);
