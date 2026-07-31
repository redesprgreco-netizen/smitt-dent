// lib/supabase-admin.ts
// Cliente Supabase para uso EXCLUSIVO en el servidor (API routes).
// Usa la service role key para acceder a Storage sin restricciones de RLS.
// NUNCA importar este archivo en un componente 'use client'.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// No lanzamos error en build time — solo en runtime si falta la config.
// Esto evita que el build de Vercel falle por variables no configuradas aún.
export const supabaseAdmin = createClient(
  url || 'https://placeholder.supabase.co',
  serviceKey || 'placeholder',
  { auth: { persistSession: false } }
)

export const BUCKET_CONTRATOS = 'contratos'
export const BUCKET_FIRMAS = 'firmas'

export function supabaseConfigured(): boolean {
  return Boolean(url && serviceKey && !url.includes('placeholder'))
}
