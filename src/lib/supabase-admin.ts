import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin =
  supabaseUrl && serviceRoleKey ? createClient<Database>(supabaseUrl, serviceRoleKey) : null;

export function ensureAdminClient() {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY if needed."
    );
  }
}
