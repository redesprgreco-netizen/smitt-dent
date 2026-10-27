import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { supabaseAdmin, BUCKET_CONTRATOS, BUCKET_FIRMAS } from '@/lib/supabase-admin'

interface FirmaConDocumento {
  token: string
  clienteNombre: string
  firmadoEn: Date | null
  firmaStoragePath: string | null
  contrato: { storagePath: string }
}

interface PdfFirmadoInput {
  token: string
  clienteNombre: string
  firmadoEn: Date
  originalPdf: ArrayBuffer
  firmaPng: Uint8Array
}

export async function guardarPdfFirmado({
  token,
  clienteNombre,
  firmadoEn,
  originalPdf,
  firmaPng,
}: PdfFirmadoInput) {
  const pdf = await PDFDocument.load(originalPdf)
  const pages = pdf.getPages()
  const lastPage = pages[pages.length - 1]
  if (!lastPage) throw new Error('El contrato PDF no contiene páginas')

  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const signatureImage = await pdf.embedPng(firmaPng)
  const page = pdf.addPage([lastPage.getWidth(), lastPage.getHeight()])
  const { width, height } = page.getSize()
  const margin = 52
  const signatureWidth = Math.min(width - margin * 2, 300)
  const signatureHeight = signatureWidth * signatureImage.height / signatureImage.width
  const signatureY = Math.max(margin + 75, height - 250 - signatureHeight)

  page.drawText('Constancia de firma electrónica', {
    x: margin,
    y: height - 70,
    size: 18,
    font,
    color: rgb(0.05, 0.16, 0.32),
  })
  page.drawText(`Firmado por: ${clienteNombre}`, {
    x: margin,
    y: height - 115,
    size: 12,
    font,
    color: rgb(0.12, 0.12, 0.12),
  })
  page.drawText(`Fecha: ${firmadoEn.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`, {
    x: margin,
    y: height - 138,
    size: 12,
    font,
    color: rgb(0.12, 0.12, 0.12),
  })
  page.drawText('El paciente declara que leyó y aceptó el contenido del documento.', {
    x: margin,
    y: height - 170,
    size: 11,
    font,
    color: rgb(0.12, 0.12, 0.12),
  })
  page.drawImage(signatureImage, {
    x: margin,
    y: signatureY,
    width: signatureWidth,
    height: signatureHeight,
  })
  page.drawText('Firma del paciente', {
    x: margin,
    y: signatureY - 18,
    size: 10,
    font,
    color: rgb(0.35, 0.35, 0.35),
  })

  const path = `documento-firmado-${token}.pdf`
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_FIRMAS)
    .upload(path, await pdf.save(), { contentType: 'application/pdf', upsert: true })
  if (error) throw new Error(`No se pudo guardar el documento firmado: ${error.message}`)
  return path
}

export async function asegurarPdfFirmado(firma: FirmaConDocumento) {
  const path = `documento-firmado-${firma.token}.pdf`
  const { data: existingPdf } = await supabaseAdmin.storage
    .from(BUCKET_FIRMAS)
    .createSignedUrl(path, 60)
  if (existingPdf?.signedUrl) return path

  if (!firma.firmaStoragePath) {
    throw new Error('No se encontró la imagen de la firma para regenerar el documento')
  }

  const [
    { data: originalPdf, error: originalPdfError },
    { data: firmaPng, error: firmaPngError },
  ] = await Promise.all([
    supabaseAdmin.storage.from(BUCKET_CONTRATOS).download(firma.contrato.storagePath),
    supabaseAdmin.storage.from(BUCKET_FIRMAS).download(firma.firmaStoragePath),
  ])
  if (originalPdfError || !originalPdf || firmaPngError || !firmaPng) {
    throw new Error('No se pudo recuperar el contrato original o la imagen de la firma')
  }

  return guardarPdfFirmado({
    token: firma.token,
    clienteNombre: firma.clienteNombre,
    firmadoEn: firma.firmadoEn ?? new Date(),
    originalPdf: await originalPdf.arrayBuffer(),
    firmaPng: new Uint8Array(await firmaPng.arrayBuffer()),
  })
}
