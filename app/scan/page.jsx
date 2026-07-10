'use client'

import { useEffect, useRef, useState } from 'react'

const DORADO = '#F5A623'
const ROJO = '#C81D25'
const NEGRO = '#0d0d0d'

export default function ScanPage() {
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [codigoManual, setCodigoManual] = useState('')
  const scannerRef = useRef(null)

  useEffect(() => {
    let html5QrCode

    async function iniciarScanner() {
      const { Html5Qrcode } = await import('html5-qrcode')
      html5QrCode = new Html5Qrcode('lector-qr')
      scannerRef.current = html5QrCode

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          async (textoDecodificado) => {
            await html5QrCode.pause()
            await procesarEscaneo(textoDecodificado)
          }
        )
      } catch (err) {
        setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
      }
    }

    iniciarScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  async function procesarEscaneo(clienteId) {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch(`/api/clientes/${clienteId}/sumar`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al procesar el escaneo')
      } else {
        setResultado(data)
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  async function canjear(clienteId) {
    setCargando(true)
    try {
      const res = await fetch(`/api/clientes/${clienteId}/canjear`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setResultado({ ...data, premio: null, ciclo_completo: false })
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  function escanearOtro() {
    setResultado(null)
    setError(null)
    setCodigoManual('')
    if (scannerRef.current) {
      scannerRef.current.resume()
    }
  }

  async function enviarCodigoManual(e) {
    e.preventDefault()
    if (!codigoManual.trim()) return
    if (scannerRef.current) {
      await scannerRef.current.pause().catch(() => {})
    }
    await procesarEscaneo(codigoManual.trim())
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: NEGRO,
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img src="/logo-circular.png" alt="La Gallina Rebelde" style={{ width: 90, height: 90, borderRadius: '50%' }} />
          <h1 style={{ fontSize: 20, marginTop: 12, color: DORADO, letterSpacing: 1 }}>ESCANEAR CLIENTE</h1>
        </div>

        <div id="lector-qr" style={{ width: '100%', borderRadius: 12, overflow: 'hidden', border: `2px solid ${DORADO}` }} />

        {!resultado && (
          <form onSubmit={enviarCodigoManual} style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="O escribe el código (ej: A3F9K2)"
              value={codigoManual}
              onChange={(e) => setCodigoManual(e.target.value.toUpperCase())}
              style={{
                flex: 1, padding: 12, borderRadius: 8, border: '1px solid #444',
                background: '#1a1a1a', color: 'white', letterSpacing: 2, textTransform: 'uppercase',
              }}
            />
            <button
              type="submit"
              style={{ padding: '0 18px', borderRadius: 8, border: 'none', background: DORADO, color: '#000', fontWeight: 700, cursor: 'pointer' }}
            >
              Sumar
            </button>
          </form>
        )}

        {cargando && <p style={{ marginTop: 16, textAlign: 'center', color: DORADO }}>Procesando...</p>}

        {error && (
          <div style={{ marginTop: 16, padding: 12, background: '#3a1010', color: '#ff8a8a', borderRadius: 8, border: `1px solid ${ROJO}` }}>
            {error}
          </div>
        )}

        {resultado && (
          <div style={{
            marginTop: 16,
            padding: 20,
            background: '#1a1a1a',
            borderRadius: 12,
            border: `2px solid ${DORADO}`,
            textAlign: 'center',
          }}>
            <p style={{ fontWeight: 700, fontSize: 18, color: DORADO }}>¡Estrella sumada!</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '16px 0' }}>
              {Array.from({ length: resultado.meta_estrellas }).map((_, i) => (
                <span key={i} style={{
                  fontSize: 26,
                  color: i < resultado.estrellas ? DORADO : '#333',
                }}>★</span>
              ))}
            </div>

            <p style={{ color: '#ccc' }}>
              Compra {resultado.estrellas} de {resultado.meta_estrellas}
            </p>

            {resultado.premio && (
              <div style={{
                marginTop: 14,
                padding: 14,
                background: ROJO,
                borderRadius: 8,
                fontWeight: 700,
              }}>
                🎉 {resultado.premio.texto}
              </div>
            )}

            {resultado.ciclo_completo && (
              <>
                <p style={{ marginTop: 12, fontSize: 13, color: '#aaa' }}>
                  Ciclo completo — entrega el premio y confirma el canje.
                </p>
                <button
                  onClick={() => canjear(resultado.id)}
                  style={{
                    marginTop: 10,
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: `2px solid ${DORADO}`,
                    background: 'transparent',
                    color: DORADO,
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Confirmar canje y reiniciar
                </button>
              </>
            )}

            <button
              onClick={escanearOtro}
              style={{
                marginTop: 16,
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: DORADO,
                color: '#000',
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Escanear siguiente cliente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
