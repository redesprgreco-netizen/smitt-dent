import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api'
import { supabaseAdmin, supabaseInfo, SUPABASE_URL, BUCKET_CONTRATOS, BUCKET_FIRMAS } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  const resultado: Record<string, unknown> = {
    version: 'storage-diag',
    config: supabaseInfo(),
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/version`, { cache: 'no-store' })
    resultado.alcanzable = { ok: true, httpStatus: r.status }
  } catch (e: any) {
    resultado.alcanzable = { ok: false, error: e?.message, causa: e?.cause?.code ?? e?.cause?.message }
  }

  try {
    const { data, error } = await supabaseAdmin.storage.listBuckets()
    resultado.buckets = error
      ? { ok: false, error: error.message }
      : {
          ok: true,
          lista: data?.map(b => b.name),
          existeContratos: data?.some(b => b.name === BUCKET_CONTRATOS),
          existeFirmas: data?.some(b => b.name === BUCKET_FIRMAS),
        }
  } catch (e: any) {
    resultado.buckets = { ok: false, error: e?.message }
  }

  return NextResponse.json(resultado)
}