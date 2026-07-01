'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Odontograma from '@/components/odontograma/Odontograma'
import type { Expediente, HistorialClinico, PlanTratamiento, Pago } from '@/types'

type Tab = 'historial' | 'odontograma' | 'presupuesto' | 'pagos'

interface ExpedienteDetalle extends Expediente {
  historial: HistorialClinico[]
  planTratamiento: PlanTratamiento[]
  pagos: Pago[]
  totalPresupuesto: number
  totalPagado: number
  saldoPendiente: number
}

export default function ExpedienteDetallePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [tab, setTab] = useState<Tab>('historial')
  const [exp, setExp] = useState<ExpedienteDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<{ id: number; rol: string } | null>(null)

  // Form states
  const [nuevaNota, setNuevaNota] = useState({ titulo: '', descripcion: '' })
  const [nuevaPieza, setNuevaPieza] = useState({ concepto: '', piezas: '', cantidad: '1', precioUnitario: '', descuentoPct: '0' })
  const [nuevoPago, setNuevoPago] = useState({ monto: '', metodoPago: 'efectivo' as 'efectivo'|'transferencia'|'tarjeta', concepto: '' })
  const [savingNota, setSavingNota] = useState(false)
  const [savingPieza, setSavingPieza] = useState(false)
  const [savingPago, setSavingPago] = useState(false)
  const [anulando, setAnulando] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.ok) setSession({ id: d.data.id, rol: d.data.rol }) })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/expedientes/${id}`)
      const data = await res.json()
      if (!res.ok) { router.push('/expedientes'); return }
      if (data.ok) setExp(data.data)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
  const fmtFecha = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { dateStyle: 'medium' })
  const fmtFechaHora = (iso: string) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })

  function edad(fNac: string | null) {
    if (!fNac) return null
    const hoy = new Date(); const nac = new Date(fNac)
    let y = hoy.getFullYear() - nac.getFullYear()
    if (hoy.getMonth() - nac.getMonth() < 0 || (hoy.getMonth() - nac.getMonth() === 0 && hoy.getDate() < nac.getDate())) y--
    return y
  }

  async function agregarNota(e: React.FormEvent) {
    e.preventDefault()
    setSavingNota(true)
    try {
      const res = await fetch('/api/historial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expedienteId: parseInt(id), ...nuevaNota }),
      })
      if (res.ok) { setNuevaNota({ titulo: '', descripcion: '' }); load() }
    } finally { setSavingNota(false) }
  }

  async function agregarPieza(e: React.FormEvent) {
    e.preventDefault()
    setSavingPieza(true)
    try {
      const res = await fetch('/api/plan-tratamiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expedienteId: parseInt(id),
          ...nuevaPieza,
          cantidad: parseFloat(nuevaPieza.cantidad),
          precioUnitario: parseFloat(nuevaPieza.precioUnitario),
          descuentoPct: parseFloat(nuevaPieza.descuentoPct),
        }),
      })
      if (res.ok) { setNuevaPieza({ concepto: '', piezas: '', cantidad: '1', precioUnitario: '', descuentoPct: '0' }); load() }
    } finally { setSavingPieza(false) }
  }

  async function cambiarEstadoPlan(planId: number, estado: string) {
    await fetch(`/api/plan-tratamiento/${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    load()
  }

  async function eliminarPlan(planId: number) {
    if (!confirm('¿Eliminar este ítem del presupuesto?')) return
    await fetch(`/api/plan-tratamiento/${planId}`, { method: 'DELETE' })
    load()
  }

  async function registrarPago(e: React.FormEvent) {
    e.preventDefault()
    setSavingPago(true)
    try {
      const res = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expedienteId: parseInt(id), ...nuevoPago, monto: parseFloat(nuevoPago.monto) }),
      })
      if (res.ok) { setNuevoPago({ monto: '', metodoPago: 'efectivo', concepto: '' }); load() }
    } finally { setSavingPago(false) }
  }

  async function anularPago(pagoId: number) {
    const motivo = prompt('Motivo de anulación:')
    if (!motivo?.trim()) return
    setAnulando(pagoId)
    try {
      await fetch(`/api/pagos/${pagoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoAnulacion: motivo.trim() }),
      })
      load()
    } finally { setAnulando(null) }
  }

  if (loading) return <p style={{ padding: 32, fontSize: 13, color: 'var(--text-muted)' }}>Cargando expediente...</p>
  if (!exp) return null

  const estadoPlanColor: Record<string, string> = { pendiente: 'pill-amber', en_curso: 'pill-blue', realizado: 'pill-green' }
  const metodoIcon: Record<string, string> = { efectivo: 'ti-cash', transferencia: 'ti-building-bank', tarjeta: 'ti-credit-card' }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/expedientes" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Expedientes</Link>
        <i className="ti ti-chevron-right" style={{ fontSize: 12 }} />
        <span style={{ color: 'var(--text-main)' }}>{exp.folio}</span>
      </div>

      {/* Header del paciente */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--blue-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'Sora', fontSize: 20, fontWeight: 700, color: 'var(--blue-accent)' }}>
              {exp.nombre[0]}{exp.apellido[0]}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontFamily: 'Sora', fontSize: 20, fontWeight: 700 }}>
                {exp.nombre} {exp.apellido}
              </h1>
              <span className="pill pill-gray">{exp.folio}</span>
              <span className={`pill ${exp.estado === 'activo' ? 'pill-green' : 'pill-gray'}`}>{exp.estado}</span>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
              {exp.fechaNacimiento && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  <i className="ti ti-cake" style={{ marginRight: 4 }} />
                  {fmtFecha(exp.fechaNacimiento)} ({edad(exp.fechaNacimiento)} años)
                </span>
              )}
              {exp.telefono && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  <i className="ti ti-phone" style={{ marginRight: 4 }} />
                  {exp.telefono}
                </span>
              )}
              {exp.correo && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  <i className="ti ti-mail" style={{ marginRight: 4 }} />
                  {exp.correo}
                </span>
              )}
              {exp.doctora && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  <i className="ti ti-stethoscope" style={{ marginRight: 4 }} />
                  {exp.doctora.nombre} {exp.doctora.apellido}
                </span>
              )}
            </div>
            {exp.alergias && (
              <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fdeae8', borderRadius: 8, padding: '4px 10px' }}>
                <i className="ti ti-alert-triangle" style={{ color: '#c0392b', fontSize: 14 }} />
                <span style={{ fontSize: 12.5, color: '#c0392b', fontWeight: 500 }}>Alergias: {exp.alergias}</span>
              </div>
            )}
          </div>

          {/* Saldo */}
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { label: 'Presupuesto', value: fmt(exp.totalPresupuesto), color: 'var(--text-main)' },
              { label: 'Pagado', value: fmt(exp.totalPagado), color: '#1a9e5c' },
              { label: 'Saldo', value: fmt(exp.saldoPendiente), color: exp.saldoPendiente > 0 ? '#c0392b' : '#1a9e5c' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', background: 'var(--surface)', borderRadius: 10, padding: '10px 14px', minWidth: 90 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        {([
          { key: 'historial', label: 'Historial clínico', icon: 'ti-notes' },
          { key: 'odontograma', label: 'Odontograma', icon: 'ti-tooth' },
          { key: 'presupuesto', label: 'Plan de tratamiento', icon: 'ti-list-check' },
          { key: 'pagos', label: 'Pagos', icon: 'ti-cash' },
        ] as { key: Tab; label: string; icon: string }[]).map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            <i className={`ti ${t.icon}`} style={{ marginRight: 6 }} />{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Historial ── */}
      {tab === 'historial' && (
        <div>
          {/* Agregar nota */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Agregar nota clínica</p>
            <form onSubmit={agregarNota}>
              <div style={{ marginBottom: 10 }}>
                <label className="form-label">Título</label>
                <input className="form-input" required value={nuevaNota.titulo}
                  onChange={e => setNuevaNota(f => ({ ...f, titulo: e.target.value }))} placeholder="Consulta de revisión, Extracción #36..." />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Descripción</label>
                <textarea className="form-textarea" required value={nuevaNota.descripcion}
                  onChange={e => setNuevaNota(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción detallada del procedimiento realizado..." />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingNota}>
                <i className="ti ti-plus" /> {savingNota ? 'Guardando...' : 'Agregar nota'}
              </button>
            </form>
          </div>

          {/* Lista de notas */}
          {exp.historial.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Sin notas clínicas aún</p>
            </div>
          ) : exp.historial.map(nota => (
            <div key={nota.id} className="card" style={{ padding: '16px 20px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {nota.esCorreccion && <span className="pill pill-amber">Corrección</span>}
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{nota.titulo}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {nota.descripcion}
                  </p>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                <span><i className="ti ti-user" style={{ marginRight: 3 }} />
                  {nota.autor?.nombre} {nota.autor?.apellido} ({nota.autor?.rol})
                </span>
                <span><i className="ti ti-clock" style={{ marginRight: 3 }} />{fmtFechaHora(nota.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Odontograma ── */}
      {tab === 'odontograma' && (
        <Odontograma expedienteId={parseInt(id)} />
      )}

      {/* ── Tab: Plan de tratamiento ── */}
      {tab === 'presupuesto' && (
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Agregar ítem al presupuesto</p>
            <form onSubmit={agregarPieza}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label">Concepto</label>
                  <input className="form-input" required value={nuevaPieza.concepto}
                    onChange={e => setNuevaPieza(f => ({ ...f, concepto: e.target.value }))} placeholder="Limpieza dental, Corona, Ortodoncia..." />
                </div>
                <div>
                  <label className="form-label">Piezas involucradas</label>
                  <input className="form-input" value={nuevaPieza.piezas}
                    onChange={e => setNuevaPieza(f => ({ ...f, piezas: e.target.value }))} placeholder="36, 37" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="form-label">Cantidad</label>
                  <input className="form-input" type="number" min="0.1" step="0.1" value={nuevaPieza.cantidad}
                    onChange={e => setNuevaPieza(f => ({ ...f, cantidad: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Precio unitario (MXN)</label>
                  <input className="form-input" type="number" min="0" step="0.01" required value={nuevaPieza.precioUnitario}
                    onChange={e => setNuevaPieza(f => ({ ...f, precioUnitario: e.target.value }))} placeholder="1500.00" />
                </div>
                <div>
                  <label className="form-label">Descuento %</label>
                  <input className="form-input" type="number" min="0" max="100" value={nuevaPieza.descuentoPct}
                    onChange={e => setNuevaPieza(f => ({ ...f, descuentoPct: e.target.value }))} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingPieza}>
                <i className="ti ti-plus" /> {savingPieza ? 'Guardando...' : 'Agregar ítem'}
              </button>
            </form>
          </div>

          {exp.planTratamiento.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Sin ítems en el plan de tratamiento</p>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Piezas</th>
                    <th>Cant.</th>
                    <th>Precio unit.</th>
                    <th>Desc. %</th>
                    <th>Subtotal</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {exp.planTratamiento.map(pt => {
                    const subtotalConDesc = Number(pt.subtotal) * (1 - Number(pt.descuentoPct) / 100)
                    return (
                      <tr key={pt.id}>
                        <td style={{ fontWeight: 500 }}>{pt.concepto}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{pt.piezas ?? '—'}</td>
                        <td>{Number(pt.cantidad)}</td>
                        <td>{fmt(Number(pt.precioUnitario))}</td>
                        <td>{Number(pt.descuentoPct) > 0 ? `${pt.descuentoPct}%` : '—'}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(subtotalConDesc)}</td>
                        <td>
                          <select
                            className="form-select"
                            style={{ width: 110, padding: '4px 8px', fontSize: 12 }}
                            value={pt.estado}
                            onChange={e => cambiarEstadoPlan(pt.id, e.target.value)}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_curso">En curso</option>
                            <option value="realizado">Realizado</option>
                          </select>
                        </td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => eliminarPlan(pt.id)}>
                            <i className="ti ti-trash" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  <tr style={{ background: 'var(--surface)' }}>
                    <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>Total presupuesto:</td>
                    <td style={{ fontWeight: 700, fontSize: 15 }}>{fmt(exp.totalPresupuesto)}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Pagos ── */}
      {tab === 'pagos' && (
        <div>
          {/* Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Total presupuesto', value: fmt(exp.totalPresupuesto), color: 'var(--text-main)', bg: '#fff' },
              { label: 'Total pagado', value: fmt(exp.totalPagado), color: '#1a9e5c', bg: '#e8f8ee' },
              { label: 'Saldo pendiente', value: fmt(exp.saldoPendiente), color: exp.saldoPendiente > 0 ? '#c0392b' : '#1a9e5c', bg: exp.saldoPendiente > 0 ? '#fdeae8' : '#e8f8ee' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '14px 18px', background: s.bg, border: `1px solid ${s.bg === '#fff' ? 'var(--border)' : s.bg}` }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Registrar pago */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Registrar pago</p>
            <form onSubmit={registrarPago}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label">Monto (MXN)</label>
                  <input className="form-input" type="number" min="0.01" step="0.01" required value={nuevoPago.monto}
                    onChange={e => setNuevoPago(f => ({ ...f, monto: e.target.value }))} placeholder="500.00" />
                </div>
                <div>
                  <label className="form-label">Método de pago</label>
                  <select className="form-select" value={nuevoPago.metodoPago}
                    onChange={e => setNuevoPago(f => ({ ...f, metodoPago: e.target.value as 'efectivo'|'transferencia'|'tarjeta' }))}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Concepto (opcional)</label>
                  <input className="form-input" value={nuevoPago.concepto}
                    onChange={e => setNuevoPago(f => ({ ...f, concepto: e.target.value }))} placeholder="Abono consulta, Pago corona..." />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingPago}>
                <i className="ti ti-cash" /> {savingPago ? 'Registrando...' : 'Registrar pago'}
              </button>
            </form>
          </div>

          {exp.pagos.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Sin pagos registrados</p>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Concepto</th>
                    <th>Estado</th>
                    {session?.rol === 'admin' && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {exp.pagos.map(pago => (
                    <tr key={pago.id} style={{ opacity: pago.estado === 'anulado' ? 0.55 : 1 }}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{pago.folioRecibo}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{fmtFechaHora(pago.createdAt)}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(Number(pago.monto))}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <i className={`ti ${metodoIcon[pago.metodoPago]}`} />
                          {pago.metodoPago.charAt(0).toUpperCase() + pago.metodoPago.slice(1)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{pago.concepto ?? '—'}</td>
                      <td>
                        <span className={`pill ${pago.estado === 'activo' ? 'pill-green' : 'pill-red'}`}>
                          {pago.estado}
                        </span>
                        {pago.estado === 'anulado' && pago.motivoAnulacion && (
                          <div style={{ fontSize: 11, color: '#c0392b', marginTop: 2 }}>
                            {pago.motivoAnulacion}
                          </div>
                        )}
                      </td>
                      {session?.rol === 'admin' && (
                        <td>
                          {pago.estado === 'activo' && (
                            <button className="btn btn-danger btn-sm"
                              onClick={() => anularPago(pago.id)}
                              disabled={anulando === pago.id}>
                              <i className="ti ti-ban" /> Anular
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
