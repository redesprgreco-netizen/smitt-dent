'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'

interface DocInfo {
  clienteNombre: string
  estado: string
  firmadoEn: string | null
  pdfUrl: string
  contratoNombre: string
}

export default function FirmarPage() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo] = useState<DocInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acepto, setAcepto] = useState(false)
  const [tieneTrazo, setTieneTrazo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [firmado, setFirmado] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dibujando = useRef(false)

  useEffect(() => {
    fetch(`/api/firmar/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setInfo(data.data)
          if (data.data.estado === 'firmado') setFirmado(true)
        } else {
          setError(data.error ?? 'Enlace no válido')
        }
      })
      .catch(() => setError('No se pudo cargar el documento'))
      .finally(() => setLoading(false))
  }, [token])

  // Ajusta el tamaño real del canvas a su tamaño mostrado (para que la firma no se vea distorsionada)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#0d2b55'
    }
  }, [info])

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    dibujando.current = true
    const ctx = canvasRef.current?.getContext('2d')
    const { x, y } = getPos(e)
    ctx?.beginPath()
    ctx?.moveTo(x, y)
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const { x, y } = getPos(e)
    ctx?.lineTo(x, y)
    ctx?.stroke()
    setTieneTrazo(true)
  }

  function endDraw() {
    dibujando.current = false
  }

  function limpiarFirma() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setTieneTrazo(false)
  }

  const enviarFirma = useCallback(async () => {
    if (!acepto || !tieneTrazo || !canvasRef.current) return
    setEnviando(true)
    try {
      const firmaDataUrl = canvasRef.current.toDataURL('image/png')
      const res = await fetch(`/api/firmar/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firmaDataUrl }),
      })
      const data = await res.json()
      if (res.ok) {
        setFirmado(true)
      } else {
        alert(data.error ?? 'No se pudo enviar la firma')
      }
    } finally {
      setEnviando(false)
    }
  }, [acepto, tieneTrazo, token])

  if (loading) {
    return <Centrado><p>Cargando documento...</p></Centrado>
  }

  if (error) {
    return (
      <Centrado>
        <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: '#c0392b' }} />
        <p style={{ marginTop: 10, fontSize: 15 }}>{error}</p>
      </Centrado>
    )
  }

  if (firmado) {
    return (
      <Centrado>
        <i className="ti ti-circle-check" style={{ fontSize: 48, color: '#1a9e5c' }} />
        <h2 style={{ marginTop: 14, fontSize: 19, fontFamily: 'Sora' }}>¡Documento firmado!</h2>
        <p style={{ marginTop: 6, fontSize: 14, color: '#666' }}>Gracias, {info?.clienteNombre}. Ya puedes cerrar esta ventana.</p>
      </Centrado>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 60px' }}>
      <h1 style={{ fontFamily: 'Sora', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{info?.contratoNombre}</h1>
      <p style={{ fontSize: 13.5, color: '#666', marginBottom: 18 }}>
        Hola {info?.clienteNombre}, por favor lee el documento completo antes de firmar.
      </p>

      <div style={{ border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden', marginBottom: 18, height: '60vh' }}>
        <iframe src={info?.pdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Contrato" />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 18, cursor: 'pointer' }}>
        <input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)} style={{ width: 18, height: 18 }} />
        He leído y acepto el contenido de este documento
      </label>

      {acepto && (
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>Firma aquí con tu dedo:</p>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 180, background: '#fafafa', border: '2px dashed #ccc', borderRadius: 10, touchAction: 'none' }}
            onPointerDown={startDraw}
            onPointerMove={draw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn btn-secondary" onClick={limpiarFirma} style={{ flex: 1 }}>
              <i className="ti ti-eraser" /> Borrar
            </button>
            <button
              className="btn btn-primary"
              onClick={enviarFirma}
              disabled={!tieneTrazo || enviando}
              style={{ flex: 2 }}
            >
              {enviando ? 'Enviando...' : 'Confirmar firma'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Centrado({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      {children}
    </div>
  )
}
