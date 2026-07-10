import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { tieneSesionValida, respuestaNoAutorizado } from '../../../../lib/auth'

// GET /api/admin/clientes -> lista todos los clientes (nombre, teléfono, estrellas, fecha)
// Protegido: solo accesible con la sesión de empleado/dueño iniciada.
export async function GET(req) {
  if (!tieneSesionValida(req)) return respuestaNoAutorizado()

  const { data, error, count } = await supabaseAdmin
    .from('clientes')
    .select('id, codigo, nombre, telefono, estrellas, meta_estrellas, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ clientes: data, total: count ?? data.length })
}
