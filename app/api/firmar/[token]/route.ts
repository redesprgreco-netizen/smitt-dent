// app/api/firmar/[token]/route.ts — Ruta PÚBLICA, sin autenticación.
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin, BUCKET_CONTRATOS, BUCKET_FIRMAS } from '@/lib/supabase-admin'

type Params = { params: { token: string } }

// Devuelve los datos del documento a firmar (nombre del cliente, link temporal del PDF, estado)
export async function GET(_req: NextRequest, { params }: Params) {
  const firma = await prisma.firmaContrato.findUnique({
    where: { token: params.token },
    include: { contrato: true },
  })
  if (!firma) return NextResponse.json({ ok: false, error: 'Enlace no válido' }, { status: 404 })

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_CONTRATOS)
    .createSignedUrl(firma.contrato.storagePath, 60 * 15) // 15 minutos

  if (error) return NextResponse.json({ ok: false, error: 'No se pudo cargar el documento' }, { status: 500 })

  return NextResponse.json({
    ok: true,
    data: {
      clienteNombre: firma.clienteNombre,
      estado: firma.estado,
      firmadoEn: firma.firmadoEn,
      pdfUrl: data.signedUrl,
      contratoNombre: firma.contrato.nombre,
    },
  })
}

// Recibe la firma (imagen en base64) y marca el documento como firmado
export async function POST(req: NextRequest, { params }: Params) {
  const firma = await prisma.firmaContrato.findUnique({ where: { token: params.token } })
  if (!firma) return NextResponse.json({ ok: false, error: 'Enlace no válido' }, { status: 404 })
  if (firma.estado === 'firmado') {
    return NextResponse.json({ ok: false, error: 'Este documento ya fue firmado' }, { status: 400 })
  }

  try {
    const { firmaDataUrl } = await req.json()
    if (!firmaDataUrl?.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ ok: false, error: 'Firma inválida' }, { status: 400 })
    }

    const base64 = firmaDataUrl.replace('data:image/png;base64,', '')
    const buffer = Buffer.from(base64, 'base64')
    const storagePath = `firma-${params.token}.png`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_FIRMAS)
      .upload(storagePath, buffer, { contentType: 'image/png', upsert: true })

    if (uploadError) {
      return NextResponse.json({ ok: false, error: 'No se pudo guardar la firma' }, { status: 500 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = req.headers.get('user-agent') ?? null

    await prisma.firmaContrato.update({
      where: { token: params.token },
      data: {
        estado: 'firmado',
        firmaStoragePath: storagePath,
        firmadoEn: new Date(),
        ipAddress: ip,
        userAgent,
      },
    })

    return NextResponse.json({ ok: true, data: { firmado: true } })
  } catch (e) {
    console.error('[firmar] Error:', e)
    return NextResponse.json({ ok: false, error: 'Error al procesar la firma' }, { status: 500 })
  }
}
