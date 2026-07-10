import { buscarClientePorTelefono } from '../../../../../lib/buscarCliente'

// GET /api/clientes/telefono/:telefono -> el cliente consulta su propia tarjeta con su número
export async function GET(req, { params }) {
  const { telefono } = params

  const { data, error } = await buscarClientePorTelefono(decodeURIComponent(telefono))

  if (error || !data) {
    return Response.json({ error: 'No encontramos ningún registro con ese teléfono' }, { status: 404 })
  }

  return Response.json(data)
}
