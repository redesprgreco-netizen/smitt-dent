import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAvailableTimes, getPublicDateRange, isRequestableDate } from '@/lib/solicitudes-cita'

export async function GET() {
  try {
    const { start, end } = getPublicDateRange()
    const citas = await prisma.cita.findMany({
      where: {
        fecha: {
          gte: new Date(`${start}T00:00:00.000Z`),
          lte: new Date(`${end}T00:00:00.000Z`),
        },
      },
      select: { fecha: true, hora: true },
    })

    const horasPorDia = new Map<string, Date[]>()
    for (const cita of citas) {
      const key = cita.fecha.toISOString().slice(0, 10)
      const times = horasPorDia.get(key) ?? []
      times.push(cita.hora)
      horasPorDia.set(key, times)
    }

    const dias = []
    for (let offset = 0; offset <= 30; offset++) {
      const date = new Date(`${start}T00:00:00.000Z`)
      date.setUTCDate(date.getUTCDate() + offset)
      const fecha = date.toISOString().slice(0, 10)
      const horarios = getAvailableTimes(fecha, horasPorDia.get(fecha) ?? [])
      if (horarios.length) dias.push({ fecha, horarios })
    }

    return NextResponse.json(
      { ok: true, data: dias },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('[solicitar-cita] No se pudo consultar la disponibilidad:', error)
    return NextResponse.json({ ok: false, error: 'No se pudo consultar la disponibilidad. Intenta de nuevo.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!req.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      return NextResponse.json({ ok: false, error: 'El formato de la solicitud no es válido' }, { status: 415 })
    }

    const origin = req.headers.get('origin')
    if (origin) {
      try {
        if (new URL(origin).origin !== req.nextUrl.origin) {
          return NextResponse.json({ ok: false, error: 'Solicitud no válida' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ ok: false, error: 'Solicitud no válida' }, { status: 403 })
      }
    }

    const contentLength = Number(req.headers.get('content-length') ?? 0)
    if (contentLength > 8_192) {
      return NextResponse.json({ ok: false, error: 'La solicitud excede el tamaño permitido' }, { status: 413 })
    }

    const reader = req.body?.getReader()
    if (!reader) {
      return NextResponse.json({ ok: false, error: 'La solicitud está vacía' }, { status: 400 })
    }
    const chunks: Uint8Array[] = []
    let bodySize = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bodySize += value.byteLength
      if (bodySize > 8_192) {
        await reader.cancel()
        return NextResponse.json({ ok: false, error: 'La solicitud excede el tamaño permitido' }, { status: 413 })
      }
      chunks.push(value)
    }
    const bodyBytes = new Uint8Array(bodySize)
    let bodyOffset = 0
    for (const chunk of chunks) {
      bodyBytes.set(chunk, bodyOffset)
      bodyOffset += chunk.byteLength
    }
    const rawBody = new TextDecoder().decode(bodyBytes)
    let body: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(rawBody)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return NextResponse.json({ ok: false, error: 'Solicitud no válida' }, { status: 400 })
      }
      body = parsed as Record<string, unknown>
    } catch {
      return NextResponse.json({ ok: false, error: 'El formato de la solicitud no es válido' }, { status: 400 })
    }
    if (body.sitioWeb != null && String(body.sitioWeb).trim()) {
      return NextResponse.json({ ok: false, error: 'Solicitud no válida' }, { status: 400 })
    }

    const nombrePaciente = typeof body.nombrePaciente === 'string' ? body.nombrePaciente.trim() : ''
    const apellidoPaciente = typeof body.apellidoPaciente === 'string' ? body.apellidoPaciente.trim() : ''
    const telefonoIngresado = typeof body.telefono === 'string' ? body.telefono.trim() : ''
    const telefono = telefonoIngresado.replace(/[^\d+]/g, '')
    const correo = typeof body.correo === 'string' ? body.correo.trim().toLowerCase() : ''
    const fecha = typeof body.fecha === 'string' ? body.fecha : ''
    const hora = typeof body.hora === 'string' ? body.hora : ''

    if (
      nombrePaciente.length < 2 || nombrePaciente.length > 80 ||
      apellidoPaciente.length < 2 || apellidoPaciente.length > 80 ||
      !/^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u.test(nombrePaciente) ||
      !/^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u.test(apellidoPaciente)
    ) {
      return NextResponse.json({ ok: false, error: 'Escribe tu nombre y apellido válidos.' }, { status: 400 })
    }
    const digitosTelefono = telefono.replace(/\D/g, '')
    if (!/^\+?[0-9\s()-]+$/.test(telefonoIngresado) || digitosTelefono.length < 8 || digitosTelefono.length > 15) {
      return NextResponse.json({ ok: false, error: 'Escribe un teléfono válido con lada.' }, { status: 400 })
    }
    if (correo.length > 120 || (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))) {
      return NextResponse.json({ ok: false, error: 'Escribe un correo válido.' }, { status: 400 })
    }
    if (!isRequestableDate(fecha) || !/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/.test(hora)) {
      return NextResponse.json({ ok: false, error: 'El horario solicitado no es válido.' }, { status: 400 })
    }

    const clientIp = req.headers.get('x-real-ip')
      ?? req.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    if (!clientIp) {
      return NextResponse.json({ ok: false, error: 'No se pudo validar la solicitud. Intenta de nuevo más tarde.' }, { status: 503 })
    }
    const ipHash = createHash('sha256').update(clientIp).digest('hex')
    const fechaDate = new Date(`${fecha}T00:00:00.000Z`)
    const horaDate = new Date(`1970-01-01T${hora}:00.000Z`)
    const outcome = await prisma.$transaction(async tx => {
      const limite = new Date(Date.now() - 15 * 60 * 1000)
      const solicitudesRecientes = await tx.solicitudCita.count({
        where: { ipHash, createdAt: { gte: limite } },
      })
      if (solicitudesRecientes >= 3) return 'rate-limited' as const

      const citas = await tx.cita.findMany({
        where: { fecha: fechaDate },
        select: { hora: true },
      })
      if (!getAvailableTimes(fecha, citas.map(cita => cita.hora)).includes(hora)) {
        return 'slot-taken' as const
      }

      const solicitudDuplicada = await tx.solicitudCita.findFirst({
        where: { telefono, fecha: fechaDate, hora: horaDate, estado: 'pendiente' },
      })
      if (solicitudDuplicada) return 'duplicate' as const

      await tx.solicitudCita.create({
        data: {
          nombrePaciente,
          apellidoPaciente,
          telefono,
          correo: correo || null,
          fecha: fechaDate,
          hora: horaDate,
          ipHash,
        },
      })
      return 'created' as const
    }, { isolationLevel: 'Serializable' })

    if (outcome === 'rate-limited') {
      return NextResponse.json(
        { ok: false, error: 'Ya enviaste varias solicitudes. Espera 15 minutos o comunícate con la clínica.' },
        { status: 429, headers: { 'Retry-After': '900' } },
      )
    }
    if (outcome === 'slot-taken') {
      return NextResponse.json({ ok: false, error: 'Ese horario acaba de dejar de estar disponible. Elige otro.' }, { status: 409 })
    }
    if (outcome === 'duplicate') {
      return NextResponse.json({ ok: false, error: 'Ya recibimos una solicitud para ese horario y teléfono.' }, { status: 409 })
    }

    return NextResponse.json({
      ok: true,
      data: { message: 'Recibimos tu solicitud. La clínica se pondrá en contacto contigo para confirmar el horario.' },
    }, { status: 201 })
  } catch (error) {
    console.error('[solicitar-cita] No se pudo guardar la solicitud:', error)
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') {
      return NextResponse.json(
        { ok: false, error: 'Se recibió otra solicitud al mismo tiempo. Espera un momento e intenta de nuevo.' },
        { status: 429, headers: { 'Retry-After': '5' } },
      )
    }
    return NextResponse.json({ ok: false, error: 'No se pudo enviar la solicitud. Intenta de nuevo.' }, { status: 500 })
  }
}
