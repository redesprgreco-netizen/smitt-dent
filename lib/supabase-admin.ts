// lib/supabase-admin.ts
// Cliente de Supabase para uso EXCLUSIVO en el servidor (API routes).
// Usa la service role key, que puede leer/escribir en Storage sin restricciones de RLS.
// NUNCA importar este archivo en un componente 'use client'.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error(
    'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY'
  )
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
})

export const BUCKET_CONTRATOS = 'contratos'
export const BUCKET_FIRMAS = 'firmas'
