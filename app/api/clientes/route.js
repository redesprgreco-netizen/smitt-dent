import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { generarCodigoCorto } from '../../../lib/codigo'

// POST /api/clientes  -> crea un cliente nuevo (primera vez que escanea tu QR de bienvenida)
// body: { nombre, telefono }
export async function POST(req) {
  const body = await req.json()

  // Intentamos generar un código único, reintentando si por casualidad ya existe uno igual.
  let cliente = null
  let error = null

  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigoCorto()

    const resultado = await supabaseAdmin
      .from('clientes')
      .insert({ nombre: body.nombre || null, telefono: body.telefono || null, codigo })
      .select()
      .single()

    if (!resultado.error) {
      cliente = resultado.data
      break
    }

    // Si el error es por código duplicado, reintenta; si es otro error, corta.
    if (!resultado.error.message.includes('duplicate')) {
      error = resultado.error
      break
    }
  }

  if (!cliente) {
    return Response.json({ error: error?.message || 'No se pudo crear el cliente' }, { status: 400 })
  }

  return Response.json(cliente)
}
