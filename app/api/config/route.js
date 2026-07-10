import { supabaseAdmin } from '../../../lib/supabaseAdmin'

// GET /api/config -> devuelve el banner de avisos/ofertas (público, lo lee la home)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('configuracion')
    .select('banner_texto, banner_activo')
    .eq('id', 1)
    .single()

  if (error || !data) {
    return Response.json({ banner_texto: '', banner_activo: false })
  }

  return Response.json(data)
}
