// app/api/firmar/[token]/route.ts — Ruta PÚBLICA, sin autenticación.
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin, BUCKET_CONTRATOS, BUCKET_FIRMAS } from '@/lib/supabase-admin'
import { asegurarPdfFirmado, guardarPdfFirmado } from '@/lib/firma-pdf'

type Params = { params: { token: string } }

// Devuelve los datos del documento a firmar (nombre del cliente, link temporal del PDF, estado)
export async function GET(_req: NextRequest, { params }: Params) {
  const firma = await prisma.firmaContrato.findUnique({
    where: { token: params.token },
    include: { contrato: true },
  })
  if (!firma) return NextResponse.json({ ok: false, error: 'Enlace no válido' }, { status: 404 })
  if (firma.estado === 'reemplazado') {
    return NextResponse.json({ ok: false, error: 'Este enlace fue sustituido. Solicita el enlace de firma más reciente a la clínica.' }, { status: 410 })
  }

  const firmado = firma.estado === 'firmado'
  if (firmado) {
    try {
      await asegurarPdfFirmado(firma)
    } catch (error) {
      console.error('[firmar] No se pudo preparar el PDF firmado:', error)
      return NextResponse.json({ ok: false, error: 'No se pudo preparar el documento firmado. Contacta a la clínica.' }, { status: 500 })
    }
  }

  const { data, error } = await supabaseAdmin.storage
    .from(firmado ? BUCKET_FIRMAS : BUCKET_CONTRATOS)
    .createSignedUrl(
      firmado ? `documento-firmado-${firma.token}.pdf` : firma.contrato.storagePath,
      60 * 60,
    )
  const { data: downloadData, error: downloadError } = firmado
    ? await supabaseAdmin.storage
      .from(BUCKET_FIRMAS)
      .createSignedUrl(`documento-firmado-${firma.token}.pdf`, 60 * 60, { download: 'documento-firmado.pdf' })
    : { data: null, error: null }

  if (error || downloadError || !data?.signedUrl || (firmado && !downloadData?.signedUrl)) {
    const storageError = error ?? downloadError
    console.error('[firmar] No se pudo generar el enlace del documento:', storageError)
    const detail = storageError?.message
    return NextResponse.json({
      ok: false,
      error: detail
        ? `No se pudo cargar el documento (${detail}). Contacta a la clínica.`
        : 'No se pudo cargar el documento. Contacta a la clínica.',
    }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    data: {
      clienteNombre: firma.clienteNombre,
      estado: firma.estado,
      firmadoEn: firma.firmadoEn,
      pdfUrl: data.signedUrl,
      downloadUrl: downloadData?.signedUrl ?? null,
      contratoNombre: firma.contrato.nombre,
    },
  })
}

// Recibe la firma (imagen en base64) y marca el documento como firmado
export async function POST(req: NextRequest, { params }: Params) {
  const firma = await prisma.firmaContrato.findUnique({
    where: { token: params.token },
    include: { contrato: true },
  })
  if (!firma) return NextResponse.json({ ok: false, error: 'Enlace no válido' }, { status: 404 })
  if (firma.estado === 'firmado') {
    return NextResponse.json({ ok: false, error: 'Este documento ya fue firmado' }, { status: 400 })
  }
  if (firma.estado !== 'pendiente') {
    return NextResponse.json({ ok: false, error: 'Este enlace ya no está vigente. Solicita el enlace más reciente a la clínica.' }, { status: 410 })
  }

  try {
    const { firmaDataUrl } = await req.json()
    if (!firmaDataUrl?.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ ok: false, error: 'Firma inválida' }, { status: 400 })
    }

    const base64 = firmaDataUrl.replace('data:image/png;base64,', '')
    const buffer = Buffer.from(base64, 'base64')
    const storagePath = `firma-${params.token}.png`

    const { data: originalPdf, error: contratoDownloadError } = await supabaseAdmin.storage
      .from(BUCKET_CONTRATOS)
      .download(firma.contrato.storagePath)
    if (contratoDownloadError || !originalPdf) {
      console.error('[firmar] No se pudo descargar el contrato original:', contratoDownloadError)
      return NextResponse.json({ ok: false, error: 'No se pudo preparar el documento firmado. Intenta de nuevo.' }, { status: 500 })
    }

    const firmadoEn = new Date()
    const signedPdfPath = await guardarPdfFirmado({
      token: params.token,
      clienteNombre: firma.clienteNombre,
      firmadoEn,
      originalPdf: await originalPdf.arrayBuffer(),
      firmaPng: buffer,
    })

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_FIRMAS)
      .upload(storagePath, buffer, { contentType: 'image/png', upsert: true })

    if (uploadError) {
      return NextResponse.json({ ok: false, error: 'No se pudo guardar la firma' }, { status: 500 })
    }

    const { data: signedPdfData, error: signedPdfUrlError } = await supabaseAdmin.storage
      .from(BUCKET_FIRMAS)
      .createSignedUrl(signedPdfPath, 60 * 60)
    const { data: downloadData, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET_FIRMAS)
      .createSignedUrl(signedPdfPath, 60 * 60, { download: 'documento-firmado.pdf' })
    if (signedPdfUrlError || downloadError || !signedPdfData?.signedUrl || !downloadData?.signedUrl) {
      console.error('[firmar] No se pudo crear el enlace del PDF firmado:', signedPdfUrlError)
      return NextResponse.json({ ok: false, error: 'La firma se guardó, pero no se pudo abrir el documento firmado.' }, { status: 500 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = req.headers.get('user-agent') ?? null

    await prisma.firmaContrato.update({
      where: { token: params.token },
      data: {
        estado: 'firmado',
        firmaStoragePath: storagePath,
        firmadoEn,
        ipAddress: ip,
        userAgent,
      },
    })

    return NextResponse.json({
      ok: true,
      data: { firmado: true, pdfUrl: signedPdfData.signedUrl, downloadUrl: downloadData.signedUrl },
    })
  } catch (e) {
    console.error('[firmar] Error:', e)
    return NextResponse.json({ ok: false, error: 'Error al procesar la firma' }, { status: 500 })
  }
}
