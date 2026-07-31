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
  const ultimoPos = useRef<{ x: number; y: number } | null>(null)

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

  // Ajusta el canvas al tamaño real del dispositivo (crucial para táctil)
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0d2b55'
    }
  }, [])

  useEffect(() => {
    if (info) {
      // Pequeño delay para que el DOM esté listo
      setTimeout(initCanvas, 100)
    }
  }, [info, acepto, initCanvas])

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    }
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    // Capturar el pointer para que funcione aunque el dedo salga del canvas brevemente
    canvasRef.current?.setPointerCapture(e.pointerId)
    dibujando.current = true
    const pos = getPos(e)
    ultimoPos.current = pos
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      // Punto inicial (para trazos cortos / puntos)
      ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!dibujando.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(ultimoPos.current?.x ?? pos.x, ultimoPos.current?.y ?? pos.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    ultimoPos.current = pos
    setTieneTrazo(true)
  }

  function endDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    dibujando.current = false
    ultimoPos.current = null
  }

  function limpiarFirma() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      const ratio = window.devicePixelRatio || 1
      ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio)
    }
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

  if (loading) return <Centrado><p style={{ fontSize: 15 }}>Cargando documento...</p></Centrado>

  if (error) {
    return (
      <Centrado>
        <i className="ti ti-alert-triangle" style={{ fontSize: 48, color: '#c0392b' }} />
        <p style={{ marginTop: 12, fontSize: 15, color: '#c0392b' }}>{error}</p>
      </Centrado>
    )
  }

  if (firmado) {
    return (
      <Centrado>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e8f8ee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <i className="ti ti-circle-check" style={{ fontSize: 40, color: '#1a9e5c' }} />
        </div>
        <h2 style={{ fontSize: 20, fontFamily: 'Sora', fontWeight: 700 }}>¡Documento firmado!</h2>
        <p style={{ marginTop: 8, fontSize: 14, color: '#666', maxWidth: 300, textAlign: 'center' }}>
          Gracias, {info?.clienteNombre}. Tu firma ha sido registrada. Ya puedes cerrar esta ventana.
        </p>
      </Centrado>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Sora', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          {info?.contratoNombre}
        </h1>
        <p style={{ fontSize: 14, color: '#666' }}>
          Hola <strong>{info?.clienteNombre}</strong>, por favor lee el documento antes de firmar.
        </p>
      </div>

      {/* PDF */}
      <div style={{ border: '1px solid #dce5f0', borderRadius: 12, overflow: 'hidden', marginBottom: 20, height: '58vh', background: '#f5f5f5' }}>
        <iframe
          src={info?.pdfUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Contrato"
        />
      </div>

      {/* Checkbox aceptar */}
      <label style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14,
        marginBottom: 20, cursor: 'pointer', lineHeight: 1.5,
        background: acepto ? '#e8f8ee' : '#f8f9fc',
        border: `1.5px solid ${acepto ? '#1a9e5c' : '#dce5f0'}`,
        borderRadius: 10, padding: '12px 14px',
      }}>
        <input
          type="checkbox"
          checked={acepto}
          onChange={e => setAcepto(e.target.checked)}
          style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0, cursor: 'pointer' }}
        />
        <span>He leído y acepto el contenido de este documento en su totalidad.</span>
      </label>

      {/* Canvas de firma */}
      {acepto && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#0d2b55' }}>
            ✍️ Firma aquí abajo con tu dedo:
          </p>
          <p style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>
            Traza tu firma en el recuadro. Si no te queda bien, usa el botón Borrar.
          </p>

          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: 200,
                background: '#fff',
                border: '2px dashed #2272d4',
                borderRadius: 12,
                touchAction: 'none',
                cursor: 'crosshair',
                display: 'block',
              }}
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={endDraw}
              onPointerCancel={endDraw}
            />
            {!tieneTrazo && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <span style={{ fontSize: 13, color: '#b0bfd8' }}>← Traza tu firma aquí →</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              onClick={limpiarFirma}
              style={{
                flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #dce5f0',
                background: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 500,
              }}
            >
              <i className="ti ti-eraser" style={{ marginRight: 6 }} />Borrar
            </button>
            <button
              onClick={enviarFirma}
              disabled={!tieneTrazo || enviando}
              style={{
                flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                background: tieneTrazo ? '#1a9e5c' : '#ccc',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: tieneTrazo ? 'pointer' : 'not-allowed',
              }}
            >
              {enviando ? 'Enviando...' : '✓ Confirmar y firmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Centrado({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: 24,
    }}>
      {children}
    </div>
  )
}