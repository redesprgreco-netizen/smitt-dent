'use client'
// components/odontograma/Odontograma.tsx
// Orquestador del odontograma: carga/guarda datos, mantiene el estado compartido
// (pieza seleccionada, superficies, notas, historial) y alterna entre la vista 2D
// grande y anatómicamente segmentada, y la vista 3D real en 360°.
import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { EstadoPieza, SuperficieDental, EstadoSuperficie, OdontogramaHistorial } from '@/types'
import {
  ADULTO_SUP_DER, ADULTO_SUP_IZQ, ADULTO_INF_IZQ, ADULTO_INF_DER, PIEZAS_ADULTO,
  INFANTIL_SUP_DER, INFANTIL_SUP_IZQ, INFANTIL_INF_IZQ, INFANTIL_INF_DER, PIEZAS_INFANTIL,
  FDI_A_ALTERNA, ESTADO_COLOR, ESTADO_LABEL, ESTADO_ICON, ESTADOS_ORDEN, SUPERFICIES,
  claseDiente, CLASE_LABEL, type PiezaData,
} from './odontograma-data'
import Odontograma2D from './Odontograma2D'

// La vista 3D usa three.js/WebGL — se carga solo en el cliente y solo cuando se
// activa la pestaña 3D, para no afectar el tiempo de carga del resto del expediente.
const Odontograma3D = dynamic(() => import('./Odontograma3D'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 560, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      Cargando vista 3D...
    </div>
  ),
})

interface Props {
  expedienteId: number
  readOnly?: boolean
}

export default function Odontograma({ expedienteId, readOnly }: Props) {
  const [piezas, setPiezas] = useState<Record<number, PiezaData>>({})
  const [selected, setSelected] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modo, setModo] = useState<'adulto' | 'infantil'>('adulto')
  const [numeracion, setNumeracion] = useState<'fdi' | 'alterna'>('fdi')
  const [vista, setVista] = useState<'2d' | '3d'>('2d')
  const [busqueda, setBusqueda] = useState('')
  const [buscarError, setBuscarError] = useState('')
  const [notaDraft, setNotaDraft] = useState('')
  const [savingNota, setSavingNota] = useState(false)
  const [historial, setHistorial] = useState<OdontogramaHistorial[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

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

  const loadHistorial = useCallback(async (numeroPieza: number) => {
    setLoadingHistorial(true)
    try {
      const res = await fetch(`/api/odontograma/historial?expedienteId=${expedienteId}&numeroPieza=${numeroPieza}`)
      const data = await res.json()
      if (data.ok) setHistorial(data.data)
    } finally {
      setLoadingHistorial(false)
    }
  }, [expedienteId])

  useEffect(() => {
    if (selected != null) {
      setNotaDraft(piezas[selected]?.notas ?? '')
      loadHistorial(selected)
    } else {
      setHistorial([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  async function guardarPieza(
    numeroPieza: number,
    cambios: Partial<{ estado: EstadoPieza; superficies: Partial<Record<SuperficieDental, EstadoSuperficie>>; notas: string }>
  ) {
    if (readOnly) return
    setSaving(true)
    try {
      const actual = piezas[numeroPieza]
      const body = {
        expedienteId,
        numeroPieza,
        estado: cambios.estado ?? actual?.estado ?? 'sin_tratamiento',
        superficies: cambios.superficies ?? actual?.superficies ?? {},
        notas: cambios.notas !== undefined ? cambios.notas : (actual?.notas ?? ''),
      }
      const res = await fetch('/api/odontograma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.ok) {
        setPiezas(prev => ({ ...prev, [numeroPieza]: data.data }))
        if (selected === numeroPieza) loadHistorial(numeroPieza)
      }
    } finally {
      setSaving(false)
    }
  }

  function cicloSuperficie(numeroPieza: number, cara: SuperficieDental) {
    const actual = piezas[numeroPieza]?.superficies?.[cara] ?? 'sano'
    const siguiente: EstadoSuperficie = actual === 'sano' ? 'caries' : actual === 'caries' ? 'obturado' : 'sano'
    const nuevas = { ...(piezas[numeroPieza]?.superficies ?? {}), [cara]: siguiente }
    guardarPieza(numeroPieza, { superficies: nuevas })
  }

  async function guardarNota() {
    if (selected == null) return
    setSavingNota(true)
    try {
      await guardarPieza(selected, { notas: notaDraft })
    } finally {
      setSavingNota(false)
    }
  }

  function buscarPieza(e: React.FormEvent) {
    e.preventDefault()
    setBuscarError('')
    const num = parseInt(busqueda.trim())
    if (PIEZAS_ADULTO.includes(num)) { setModo('adulto'); setSelected(num); setBusqueda(''); return }
    if (PIEZAS_INFANTIL.includes(num)) { setModo('infantil'); setSelected(num); setBusqueda(''); return }
    setBuscarError('Número de pieza no válido')
  }

  const piezasSet = modo === 'adulto' ? PIEZAS_ADULTO : PIEZAS_INFANTIL
  const cuadrantes = modo === 'adulto'
    ? { supDer: ADULTO_SUP_DER, supIzq: ADULTO_SUP_IZQ, infIzq: ADULTO_INF_IZQ, infDer: ADULTO_INF_DER }
    : { supDer: INFANTIL_SUP_DER, supIzq: INFANTIL_SUP_IZQ, infIzq: INFANTIL_INF_IZQ, infDer: INFANTIL_INF_DER }

  const resumen = useMemo(() => {
    const conteo: Partial<Record<EstadoPieza, number>> = {}
    for (const num of piezasSet) {
      const estado = piezas[num]?.estado ?? 'sin_tratamiento'
      conteo[estado] = (conteo[estado] ?? 0) + 1
    }
    return conteo
  }, [piezas, piezasSet])

  if (loading) return <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando odontograma...</p>

  const piezaSel = selected != null ? piezas[selected] : undefined

  return (
    <div>
      {/* ── Barra de controles ── */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: 4, borderRadius: 9 }}>
          {(['2d', '3d'] as const).map(v => (
            <button key={v} type="button" onClick={() => setVista(v)}
              className="btn btn-sm"
              style={{
                background: vista === v ? '#fff' : 'transparent',
                border: 'none', boxShadow: vista === v ? '0 1px 3px rgba(20,30,50,0.12)' : 'none',
                color: vista === v ? 'var(--blue-accent)' : 'var(--text-muted)', fontWeight: 600,
              }}>
              <i className={`ti ${v === '2d' ? 'ti-layout-grid' : 'ti-rotate-3d'}`} style={{ marginRight: 5 }} />
              {v === '2d' ? 'Vista 2D' : 'Vista 3D · 360°'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {(['adulto', 'infantil'] as const).map(m => (
            <button key={m} type="button" onClick={() => { setModo(m); setSelected(null) }}
              className="btn btn-sm"
              style={{
                background: modo === m ? 'var(--blue-light)' : '#fff',
                border: `1px solid ${modo === m ? 'var(--blue-accent)' : 'var(--border)'}`,
                color: modo === m ? 'var(--blue-accent)' : 'var(--text-main)',
              }}>
              <i className={`ti ${m === 'adulto' ? 'ti-user' : 'ti-baby-carriage'}`} style={{ marginRight: 5 }} />
              {m === 'adulto' ? 'Dentición permanente' : 'Dentición temporal'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {(['fdi', 'alterna'] as const).map(n => (
            <button key={n} type="button" onClick={() => setNumeracion(n)}
              className="btn btn-sm"
              style={{
                background: numeracion === n ? 'var(--surface)' : '#fff',
                border: '1px solid var(--border)', color: 'var(--text-main)',
              }}>
              {n === 'fdi' ? 'Numeración FDI' : modo === 'adulto' ? 'Numeración Universal' : 'Letras A–T'}
            </button>
          ))}
        </div>

        <form onSubmit={buscarPieza} style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
          <input
            className="form-input" style={{ width: 110 }}
            placeholder="Ir a pieza #"
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setBuscarError('') }}
          />
          <button type="submit" className="btn btn-secondary btn-sm"><i className="ti ti-search" /></button>
          {buscarError && <span style={{ fontSize: 11.5, color: '#c0392b' }}>{buscarError}</span>}
        </form>
      </div>

      {/* ── Resumen ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {ESTADOS_ORDEN.filter(e => e !== 'sin_tratamiento' && resumen[e]).map(estado => (
          <div key={estado} style={{
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500,
            padding: '5px 10px', borderRadius: 20, background: ESTADO_COLOR[estado].bg,
            border: `1px solid ${ESTADO_COLOR[estado].border}`, color: ESTADO_COLOR[estado].fg,
          }}>
            {ESTADO_ICON[estado] && <i className={`ti ${ESTADO_ICON[estado]}`} style={{ fontSize: 12 }} />}
            {resumen[estado]} {ESTADO_LABEL[estado]}
          </div>
        ))}
        {piezasSet.every(n => (piezas[n]?.estado ?? 'sin_tratamiento') === 'sin_tratamiento') && (
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Sin hallazgos registrados todavía — todas las piezas sanas</div>
        )}
      </div>

      {/* ── Diagrama (2D o 3D) ── */}
      <div className="card" style={{ padding: vista === '2d' ? 28 : 18 }}>
        {vista === '2d' ? (
          <Odontograma2D
            piezas={piezas} selected={selected} onSelect={setSelected}
            numeracion={numeracion} cuadrantes={cuadrantes}
          />
        ) : (
          <Odontograma3D
            piezas={piezas} selected={selected} onSelect={setSelected}
            numeracion={numeracion} cuadrantes={cuadrantes}
          />
        )}

        {/* ── Panel de edición de pieza seleccionada (común a ambas vistas) ── */}
        {selected != null && (
          <div style={{ marginTop: 20, padding: '16px 18px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Pieza #{selected}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                  {CLASE_LABEL[claseDiente(selected)]} · {FDI_A_ALTERNA[selected] && `#${FDI_A_ALTERNA[selected]} en numeración alterna`}
                </span>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Estado general */}
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Estado general de la pieza</p>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
              {ESTADOS_ORDEN.map(estado => (
                <button
                  key={estado}
                  disabled={saving || readOnly}
                  onClick={() => guardarPieza(selected, { estado })}
                  className="btn btn-sm"
                  style={{
                    background: piezaSel?.estado === estado ? ESTADO_COLOR[estado].bg : '#fff',
                    border: `1px solid ${piezaSel?.estado === estado ? ESTADO_COLOR[estado].border : 'var(--border)'}`,
                    color: piezaSel?.estado === estado ? ESTADO_COLOR[estado].fg : 'var(--text-main)',
                  }}
                >
                  {ESTADO_ICON[estado] && <i className={`ti ${ESTADO_ICON[estado]}`} style={{ marginRight: 5 }} />}
                  {ESTADO_LABEL[estado]}
                </button>
              ))}
            </div>

            {/* Superficies dentales */}
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
              Hallazgos por superficie <span style={{ fontWeight: 400 }}>(clic para ciclar: sano → caries → obturado)</span>
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gridTemplateRows: 'repeat(3, 40px)',
              gap: 4, marginBottom: 20, justifyContent: 'start',
            }}>
              <div />
              <SurfaceCell label={SUPERFICIES[0]} pieza={piezaSel} onClick={() => cicloSuperficie(selected, 'vestibular')} disabled={saving || readOnly} />
              <div />
              <SurfaceCell label={SUPERFICIES[1]} pieza={piezaSel} onClick={() => cicloSuperficie(selected, 'mesial')} disabled={saving || readOnly} />
              <SurfaceCell label={SUPERFICIES[2]} pieza={piezaSel} onClick={() => cicloSuperficie(selected, 'oclusal')} disabled={saving || readOnly} highlight />
              <SurfaceCell label={SUPERFICIES[3]} pieza={piezaSel} onClick={() => cicloSuperficie(selected, 'distal')} disabled={saving || readOnly} />
              <div />
              <SurfaceCell label={SUPERFICIES[4]} pieza={piezaSel} onClick={() => cicloSuperficie(selected, 'palatino')} disabled={saving || readOnly} />
              <div />
            </div>

            {/* Notas */}
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Notas clínicas de la pieza</p>
            <textarea
              className="form-textarea" style={{ marginBottom: 8 }}
              value={notaDraft} disabled={readOnly}
              onChange={e => setNotaDraft(e.target.value)}
              placeholder="Observaciones específicas de esta pieza..."
            />
            {!readOnly && (
              <button type="button" className="btn btn-secondary btn-sm" disabled={savingNota || notaDraft === (piezaSel?.notas ?? '')} onClick={guardarNota} style={{ marginBottom: 20 }}>
                <i className="ti ti-device-floppy" /> {savingNota ? 'Guardando...' : 'Guardar nota'}
              </button>
            )}
            {readOnly && <div style={{ marginBottom: 20 }} />}

            {/* Última actualización */}
            {piezaSel?.updater && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                <i className="ti ti-user-circle" style={{ fontSize: 14 }} />
                Última actualización por {piezaSel.updater.nombre} {piezaSel.updater.apellido}
                {piezaSel.updatedAt && (
                  <> · {new Date(piezaSel.updatedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' })}</>
                )}
              </div>
            )}

            {/* Historial de cambios */}
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Historial de cambios de esta pieza</p>
            {loadingHistorial ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Cargando historial...</p>
            ) : historial.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Sin cambios registrados aún para esta pieza.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                {historial.map(h => (
                  <div key={h.id} style={{ fontSize: 12, color: 'var(--text-main)', display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <i className="ti ti-arrow-forward-up" style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span>
                      <strong>{ESTADO_LABEL[h.estadoAnterior]}</strong> → <strong>{ESTADO_LABEL[h.estadoNuevo]}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {' · '}{h.changer ? `${h.changer.nombre} ${h.changer.apellido}` : 'Usuario no disponible'}
                        {' · '}{new Date(h.changedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' })}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Leyenda ── */}
        <div style={{ display: 'flex', gap: 14, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {ESTADOS_ORDEN.map(estado => (
            <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <div style={{
                width: 13, height: 13, borderRadius: 4,
                border: `1.5px ${estado === 'ausente' ? 'dashed' : 'solid'} ${ESTADO_COLOR[estado].border}`,
                background: estado === 'ausente' ? 'transparent' : ESTADO_COLOR[estado].bg,
              }} />
              {ESTADO_LABEL[estado]}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d8303f' }} />
            Con hallazgos por superficie
          </div>
        </div>
      </div>
    </div>
  )
}

function SurfaceCell({
  label, pieza, onClick, disabled, highlight,
}: {
  label: { key: SuperficieDental; label: string; corta: string }
  pieza?: PiezaData
  onClick: () => void
  disabled?: boolean
  highlight?: boolean
}) {
  const estado = pieza?.superficies?.[label.key] ?? 'sano'
  const map: Record<string, { bg: string; border: string }> = {
    sano: { bg: '#ffffff', border: '#dce5f0' },
    caries: { bg: '#fde9ea', border: '#d8303f' },
    obturado: { bg: '#e8f1fb', border: '#2272d4' },
  }
  const c = map[estado] ?? map.sano
  return (
    <button
      type="button" disabled={disabled} onClick={onClick} title={label.label}
      className="btn"
      style={{
        width: highlight ? 40 : 36, height: highlight ? 40 : 36, padding: 0,
        borderRadius: highlight ? 10 : 8,
        background: c.bg, border: `1.5px solid ${c.border}`,
        color: 'var(--text-main)', fontSize: 11, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto',
      }}
    >
      {label.corta}
    </button>
  )
}
