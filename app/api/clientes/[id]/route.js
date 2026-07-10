import { buscarClientePorIdOCodigo } from '../../../../lib/buscarCliente'

// GET /api/clientes/:id -> consulta cuántas estrellas tiene (por id largo o código corto)
export async function GET(req, { params }) {
  const { id } = params

  const { data, error } = await buscarClientePorIdOCodigo(id)

  if (error || !data) {
    return Response.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  return Response.json(data)
}
