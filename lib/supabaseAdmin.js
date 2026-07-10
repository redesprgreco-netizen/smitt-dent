import { createClient } from '@supabase/supabase-js'

// Este cliente se usa SOLO en las API routes (servidor), nunca en el navegador.
// Usa la service_role key, que tiene permisos completos y se salta RLS.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
