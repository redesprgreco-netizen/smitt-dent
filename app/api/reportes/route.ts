// app/api/reportes/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, serverError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  const tipo = req.nextUrl.searchParams.get('tipo') ?? 'resumen'
  const desde = req.nextUrl.searchParams.get('desde')
  const hasta = req.nextUrl.searchParams.get('hasta')

  const fechaDesde = desde ? new Date(desde) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const fechaHasta = hasta ? new Date(hasta)  : new Date()

  try {
    if (tipo === 'resumen') {
      const [totalCitas, totalExpedientes, totalPagos, pagosPorMetodo, citasPorEstado] = await prisma.$transaction([
        prisma.cita.count({ where: { fecha: { gte: fechaDesde, lte: fechaHasta } } }),
        prisma.expediente.count({ where: { createdAt: { gte: fechaDesde, lte: fechaHasta } } }),
        prisma.pago.aggregate({
          where: { estado: 'activo', createdAt: { gte: fechaDesde, lte: fechaHasta } },
          _sum: { monto: true },
          _count: true,
        }),
        prisma.pago.groupBy({
          by: ['metodoPago'],
          where: { estado: 'activo', createdAt: { gte: fechaDesde, lte: fechaHasta } },
          _sum: { monto: true },
          _count: true,
          orderBy: { _sum: { monto: 'desc' } },
        }),
        prisma.cita.groupBy({
          by: ['estado'],
          where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
          _count: true,
          orderBy: { _count: { estado: 'desc' } },
        }),
      ])

      return ok({
        periodo: { desde: fechaDesde, hasta: fechaHasta },
        citas: { total: totalCitas, porEstado: citasPorEstado },
        expedientes: { nuevos: totalExpedientes },
        pagos: {
          totalMonto: Number(totalPagos._sum.monto ?? 0),
          totalTransacciones: totalPagos._count,
          porMetodo: pagosPorMetodo.map(p => ({
            metodo: p.metodoPago,
            monto: Number(p._sum.monto ?? 0),
            cantidad: p._count,
          })),
        },
      })
    }

    if (tipo === 'pagos-doctora') {
      const data = await prisma.$queryRaw`
        SELECT
          u.id,
          u.nombre || ' ' || u.apellido AS doctora,
          COUNT(p.id)::int AS total_transacciones,
          COALESCE(SUM(p.monto), 0)::float AS total_monto
        FROM usuarios u
        LEFT JOIN expedientes e ON e.doctora_id = u.id
        LEFT JOIN pagos p ON p.expediente_id = e.id
          AND p.estado = 'activo'
          AND p.created_at BETWEEN ${fechaDesde} AND ${fechaHasta}
        WHERE u.rol IN ('doctora', 'visitante', 'admin')
        GROUP BY u.id, u.nombre, u.apellido
        ORDER BY total_monto DESC
      `
      return ok(data)
    }

    if (tipo === 'inventario-alertas') {
      const data = await prisma.inventarioArticulo.findMany({
        where: { activo: true, stockActual: { lt: prisma.inventarioArticulo.fields.stockMinimo } },
        orderBy: { nombre: 'asc' },
      })
      return ok(data)
    }

    return badRequest(`Tipo de reporte no reconocido: ${tipo}. Usa: resumen, pagos-doctora, inventario-alertas`)
  } catch (e) {
    return serverError(e)
  }
}
