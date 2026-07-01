'use client'
import { useState, useEffect, useCallback } from 'react'
import type { EstadoPieza } from '@/types'

interface Props {
  expedienteId: number
  readOnly?: boolean
}

// Numeración FDI: cuadrantes 1-4
const CUADRANTE_SUP_DER = [18,17,16,15,14,13,12,11] // arriba derecha → centro
const CUADRANTE_SUP_IZQ = [21,22,23,24,25,26,27,28] // centro → arriba izquierda
const CUADRANTE_INF_IZQ = [38,37,36,35,34,33,32,31] // abajo izquierda → centro
const CUADRANTE_INF_DER = [41,42,43,44,45,46,47,48] // centro → abajo derecha

const ESTADO_COLOR: Record<EstadoPieza, { bg: string; border: string }> = {
  sin_tratamiento: { bg: '#ffffff', border: '#dce5f0' },
  tratado:         { bg: '#e8f8ee', border: '#1a9e5c' },
  pendiente:       { bg: '#fff4e0', border: '#c87d00' },
  extraccion:      { bg: '#fdeee8', border: '#d85a30' },
}

const ESTADO_LABEL: Record<EstadoPieza, string> = {
  sin_tratamiento: 'Sin tratamiento',
  tratado: 'Tratado',
  pendiente: 'Pendiente',
  extraccion: 'Extracción',
}

interface PiezaData { numeroPieza: number; estado: EstadoPieza; notas: string | null }

export default function Odontograma({ expedienteId, readOnly }: Props) {
  const [piezas, setPiezas] = useState<Record<number, PiezaData>>({})
  const [selected, setSelected] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/odontograma?expedienteId=${expedienteId}`)
      const data = await res.json()
      if (data.ok) {
        const map: Record<number, PiezaData> = {}
        for (const p of data.data.piezas) map[p.numeroPieza] = p
        setPiezas(map)
      }
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { load() }, [load])

  async function setEstado(numeroPieza: number, estado: EstadoPieza) {
    if (readOnly) return
    setSaving(true)
    try {
      const res = await fetch('/api/odontograma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expedienteId, numeroPieza, estado, notas: piezas[numeroPieza]?.notas ?? '' }),
      })
      const data = await res.json()
      if (data.ok) setPiezas(prev => ({ ...prev, [numeroPieza]: data.data }))
    } finally {
      setSaving(false)
    }
  }

  function Tooth({ num }: { num: number }) {
    const pieza = piezas[num]
    const estado = pieza?.estado ?? 'sin_tratamiento'
    const colors = ESTADO_COLOR[estado]
    const isSelected = selected === num

    return (
      <div
        onClick={() => setSelected(isSelected ? null : num)}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}
      >
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{num}</span>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          border: `1.5px solid ${isSelected ? 'var(--blue-accent)' : colors.border}`,
          background: colors.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isSelected ? '0 0 0 2px rgba(34,114,212,0.25)' : undefined,
          transition: 'border-color 0.15s',
        }}>
          {estado === 'extraccion' && <i className="ti ti-x" style={{ fontSize: 13, color: '#d85a30' }} />}
          {estado === 'tratado' && <i className="ti ti-check" style={{ fontSize: 13, color: '#1a9e5c' }} />}
          {estado === 'pendiente' && <i className="ti ti-clock" style={{ fontSize: 12, color: '#c87d00' }} />}
        </div>
      </div>
    )
  }

  if (loading) return <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando odontograma...</p>

  return (
    <div className="card" style={{ padding: 24 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
        Arcada superior
      </p>
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px dashed var(--border)' }}>
        {CUADRANTE_SUP_DER.map(n => <Tooth key={n} num={n} />)}
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
        {CUADRANTE_SUP_IZQ.map(n => <Tooth key={n} num={n} />)}
      </div>

      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 12 }}>
        {CUADRANTE_INF_DER.slice().reverse().map(n => <Tooth key={n} num={n} />)}
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
        {CUADRANTE_INF_IZQ.slice().reverse().map(n => <Tooth key={n} num={n} />)}
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'center' }}>
        Arcada inferior
      </p>

      {/* Panel de edición de pieza seleccionada */}
      {selected && !readOnly && (
        <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Pieza #{selected}</span>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <i className="ti ti-x" />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(Object.keys(ESTADO_LABEL) as EstadoPieza[]).map(estado => (
              <button
                key={estado}
                disabled={saving}
                onClick={() => setEstado(selected, estado)}
                className="btn btn-sm"
                style={{
                  background: piezas[selected]?.estado === estado ? ESTADO_COLOR[estado].bg : '#fff',
                  border: `1px solid ${piezas[selected]?.estado === estado ? ESTADO_COLOR[estado].border : 'var(--border)'}`,
                  color: 'var(--text-main)',
                }}
              >
                {ESTADO_LABEL[estado]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 16, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        {(Object.keys(ESTADO_LABEL) as EstadoPieza[]).map(estado => (
          <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${ESTADO_COLOR[estado].border}`, background: ESTADO_COLOR[estado].bg }} />
            {ESTADO_LABEL[estado]}
          </div>
        ))}
      </div>
    </div>
  )
}
