import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { buscarClientePorIdOCodigo } from '../../../../../lib/buscarCliente'

// POST /api/clientes/:id/canjear -> resetea las estrellas cuando el cliente canjea su premio
export async function POST(req, { params }) {
  const { id } = params

  const { data: cliente, error: errorBusqueda } = await buscarClientePorIdOCodigo(id)

  if (errorBusqueda || !cliente) {
    return Response.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const { data: actualizado, error } = await supabaseAdmin
    .from('clientes')
    .update({ estrellas: 0 })
    .eq('id', cliente.id)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  await supabaseAdmin.from('historial').insert({ cliente_id: cliente.id, accion: 'canje' })

  return Response.json(actualizado)
}
