import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,      // URL pública del proyecto
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // anon key pública
);
