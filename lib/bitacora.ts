// lib/bitacora.ts — helper para registrar acciones en la bitácora
import prisma from './prisma'

interface LogParams {
  usuarioId: number
  accion: string
  tablaAfectada: string
  registroId?: number
  valorAnterior?: Record<string, unknown> | null
  valorNuevo?: Record<string, unknown> | null
  ipAddress?: string | null
}

export async function logAccion(params: LogParams): Promise<void> {
  try {
    await prisma.bitacora.create({
      data: {
        usuarioId: params.usuarioId,
        accion: params.accion,
        tablaAfectada: params.tablaAfectada,
        registroId: params.registroId ?? null,
        valorAnterior: params.valorAnterior ?? undefined,
        valorNuevo: params.valorNuevo ?? undefined,
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch (e) {
    // No interrumpir el flujo principal si falla el log
    console.error('[Bitácora] Error al registrar:', e)
  }
}

export function getIp(req: Request): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
