// lib/supabase-admin.ts
// Cliente Supabase para uso EXCLUSIVO en el servidor (API routes).
// Usa la service role key para acceder a Storage sin restricciones de RLS.
// NUNCA importar este archivo en un componente 'use client'.
import { createClient } from '@supabase/supabase-js'

// Limpia errores típicos al pegar variables en Vercel:
// espacios, saltos de línea, comillas, "/" final o rutas como /rest/v1
function limpiarUrl(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\/(rest|storage|auth)\/v1.*$/i, '')
    .replace(/\/+$/, '')
}

function limpiarKey(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '')
}

export const SUPABASE_URL = limpiarUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
const serviceKey = limpiarKey(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')

// No lanzamos error en build time — solo en runtime si falta la config.
export const supabaseAdmin = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  serviceKey || 'placeholder',
  { auth: { persistSession: false } }
)

export const BUCKET_CONTRATOS = 'contratos'
export const BUCKET_FIRMAS = 'firmas'

export function supabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && serviceKey && !SUPABASE_URL.includes('placeholder'))
}

// Solo para diagnóstico (no expone secretos)
export function supabaseInfo() {
  let host = ''
  let urlValida = false
  try {
    host = new URL(SUPABASE_URL).host
    urlValida = true
  } catch {}
  let rolKey = 'desconocido'
  try {
    const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString())
    rolKey = payload.role ?? 'sin rol'
  } catch {}
  return { host, urlValida, tieneKey: Boolean(serviceKey), rolKey }
}