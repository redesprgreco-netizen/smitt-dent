import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { premioParaCompra, META_ESTRELLAS } from '../../../../../lib/premios'
import { buscarClientePorIdOCodigo } from '../../../../../lib/buscarCliente'

// POST /api/clientes/:id/sumar -> suma 1 estrella cuando el cliente compra
// El :id puede ser el ID largo (uuid) o el código corto del cliente.
export async function POST(req, { params }) {
  const { id } = params

  const { data: cliente, error: errorBusqueda } = await buscarClientePorIdOCodigo(id)

  if (errorBusqueda || !cliente) {
    return Response.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const nuevasEstrellas = cliente.estrellas + 1
  const premio = premioParaCompra(nuevasEstrellas)
  const cicloCompleto = nuevasEstrellas >= META_ESTRELLAS

  const { data: actualizado, error: errorUpdate } = await supabaseAdmin
    .from('clientes')
    .update({ estrellas: nuevasEstrellas })
    .eq('id', cliente.id)
    .select()
    .single()

  if (errorUpdate) {
    return Response.json({ error: errorUpdate.message }, { status: 400 })
  }

  await supabaseAdmin.from('historial').insert({
    cliente_id: cliente.id,
    accion: 'suma',
    premio: premio ? premio.texto : null,
  })

  return Response.json({
    ...actualizado,
    premio,
    ciclo_completo: cicloCompleto,
  })
}
