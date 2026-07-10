import { createClient } from '@supabase/supabase-js'

// Este cliente es seguro para usar en el navegador: usa la clave pública (anon/publishable).
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)
