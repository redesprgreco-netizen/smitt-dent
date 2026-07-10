import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { tieneSesionValida, respuestaNoAutorizado } from '../../../../lib/auth'

// PUT /api/admin/config -> actualiza el texto y el on/off del banner de avisos
// body: { banner_texto, banner_activo }
export async function PUT(req) {
  if (!tieneSesionValida(req)) return respuestaNoAutorizado()

  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('configuracion')
    .update({
      banner_texto: body.banner_texto ?? '',
      banner_activo: Boolean(body.banner_activo),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json(data)
}
