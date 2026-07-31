import { Prisma } from '@prisma/client'
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
        valorAnterior: params.valorAnterior ?? Prisma.JsonNull,
        valorNuevo: params.valorNuevo ?? Prisma.JsonNull,
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch (e) {
    console.error('[Bitácora] Error al registrar:', e)
  }
}

export function getIp(req: Request): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
