'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Pago, PlanTratamiento } from '@/types'
import { loadImageAsDataUrl } from '@/lib/pdf'

interface ExpedienteBusqueda {
  id: number; folio: string; nombre: string; apellido: string
}

interface ExpedientePresupuesto {
  id: number; folio: string; nombre: string; apellido: string
  totalPresupuesto: number; totalPagado: number; saldoPendiente: number
  planTratamiento: PlanTratamiento[]
}

export default function FacturacionPage() {
  const searchParams = useSearchParams()
  const [vista, setVista] = useState<'pagos' | 'presupuestos'>('pagos')
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [session, setSession] = useState<{ id: number; rol: string } | null>(null)

  // ── Presupuestos (anidado desde el expediente, para tenerlo a la mano en facturación) ──
  const [busqueda, setBusqueda] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ExpedienteBusqueda[]>([])
  const [buscando, setBuscando] = useState(false)
  const [expSeleccionado, setExpSeleccionado] = useState<ExpedientePresupuesto | null>(null)
  const [cargandoExp, setCargandoExp] = useState(false)
  const [nuevoPago, setNuevoPago] = useState({ monto: '', metodoPago: 'efectivo' as 'efectivo'|'transferencia'|'tarjeta', concepto: '' })
  const [savingPago, setSavingPago] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.ok) setSession({ id: d.data.id, rol: d.data.rol }) })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/pagos?page=${page}&pageSize=25`)
      const data = await res.json()
      if (data.ok) {
        setPagos(data.data)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  // Buscar expedientes por nombre/folio para ver su presupuesto
  useEffect(() => {
    if (vista !== 'presupuestos' || !busqueda.trim()) { setResultadosBusqueda([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/expedientes?q=${encodeURIComponent(busqueda.trim())}&pageSize=8`)
        const data = await res.json()
        if (data.ok) setResultadosBusqueda(data.data)
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda, vista])

  // Botón de lupa: permite explorar la lista de pacientes aunque el campo esté vacío
  // (por si no se recuerda el nombre exacto). Reusa el mismo endpoint de búsqueda.
  const explorarPacientes = useCallback(async () => {
    setBuscando(true)
    try {
      const res = await fetch(`/api/expedientes?q=${encodeURIComponent(busqueda.trim())}&pageSize=20`)
      const data = await res.json()
      if (data.ok) setResultadosBusqueda(data.data)
    } finally {
      setBuscando(false)
    }
  }, [busqueda])

  const cargarPresupuesto = useCallback(async (expedienteId: number) => {
    setCargandoExp(true)
    setResultadosBusqueda([])
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}`)
      const data = await res.json()
      if (data.ok) setExpSeleccionado(data.data)
    } finally {
      setCargandoExp(false)
    }
  }, [])

  async function registrarPagoDesdeFacturacion(e: React.FormEvent) {
    e.preventDefault()
    if (!expSeleccionado) return
    setSavingPago(true)
    try {
      const res = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expedienteId: expSeleccionado.id, ...nuevoPago, monto: parseFloat(nuevoPago.monto) }),
      })
      if (res.ok) {
        setNuevoPago({ monto: '', metodoPago: 'efectivo', concepto: '' })
        cargarPresupuesto(expSeleccionado.id)
        load()
      } else {
        const error = await res.json()
        alert(error.error || 'Error al registrar pago')
      }
    } finally {
      setSavingPago(false)
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
  const fmtFecha = (iso: string) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })

  const metodoIcon: Record<string, string> = {
    efectivo: 'ti-cash', transferencia: 'ti-building-bank', tarjeta: 'ti-credit-card',
  }

  async function anularPago(pagoId: number) {
    const motivo = prompt('Motivo de anulación:')
    if (!motivo?.trim()) return
    await fetch(`/api/pagos/${pagoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivoAnulacion: motivo.trim() }),
    })
    load()
  }

  async function generarRecibo(pago: Pago) {
    const res = await fetch(`/api/expedientes/${pago.expedienteId}`)
    const data = await res.json()
    if (!data.ok) return
    const expediente = data.data
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const logo = await loadImageAsDataUrl('/dentista.jpg')
    if (logo) doc.addImage(logo, 'PNG', 18, 14, 48, 15)
    doc.setTextColor('#0d2b55')
    doc.setFontSize(18)
    doc.text('Recibo de pago', 18, logo ? 42 : 22)
    doc.setFontSize(10)
    doc.setTextColor('#6b7fa3')
    doc.text(`Folio: ${pago.folioRecibo}`, 18, logo ? 49 : 29)
    doc.text(`Fecha: ${new Date(pago.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}`, 18, logo ? 55 : 35)
    doc.setTextColor('#0d2b55')
    doc.setFontSize(11)
    doc.text(`Paciente: ${expediente.nombre} ${expediente.apellido} (${expediente.folio})`, 18, logo ? 66 : 46)
    doc.line(18, logo ? 72 : 52, 192, logo ? 72 : 52)
    let y = logo ? 84 : 64
    doc.setFontSize(11)
    doc.text('Detalle del pago', 18, y)
    y += 8
    doc.setFontSize(10)
    doc.text(`Concepto: ${pago.concepto ?? 'Pago de servicios dentales'}`, 18, y)
    doc.text(`Método: ${pago.metodoPago.charAt(0).toUpperCase() + pago.metodoPago.slice(1)}`, 18, y + 7)
    y += 21
    const totalPagado = expediente.pagos.filter((item: Pago) => item.estado === 'activo').reduce((sum: number, item: Pago) => sum + Number(item.monto), 0)
    const totalPresupuesto = Number(expediente.totalPresupuesto)
    const saldo = Math.max(0, totalPresupuesto - totalPagado)
    doc.setFontSize(11)
    doc.text(`Este pago: ${fmt(Number(pago.monto))}`, 18, y)
    doc.text(`Total del presupuesto: ${fmt(totalPresupuesto)}`, 18, y + 8)
    doc.text(`Total pagado: ${fmt(totalPagado)}`, 18, y + 16)
    doc.setFontSize(13)
    doc.text(`Saldo pendiente: ${fmt(saldo)}`, 18, y + 28)
    y += 42
    doc.setFontSize(11)
    doc.text('Pagos registrados', 18, y)
    y += 7
    doc.setFontSize(9)
    for (const item of expediente.pagos) {
      if (y > 275) { doc.addPage(); y = 20 }
      const estado = item.estado === 'activo' ? 'Activo' : 'Anulado'
      doc.text(`${item.folioRecibo}  ${new Date(item.createdAt).toLocaleDateString('es-MX')}  ${fmt(Number(item.monto))}  ${estado}`, 18, y)
      y += 6
    }
    doc.setFontSize(9)
    doc.setTextColor('#6b7fa3')
    doc.text('Este documento es un comprobante de pago.', 18, Math.min(y + 12, 285))
    doc.save(`recibo-${pago.folioRecibo}.pdf`)
  }

  async function descargarPresupuesto() {
    if (!expSeleccionado) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const logo = await loadImageAsDataUrl('/dentista.jpg')
    if (logo) doc.addImage(logo, 'PNG', 18, 14, 48, 15)
    const inicio = logo ? 42 : 22
    doc.setTextColor('#0d2b55')
    doc.setFontSize(18)
    doc.text('Desglose de presupuesto', 18, inicio)
    doc.setFontSize(10)
    doc.text(`Paciente: ${expSeleccionado.nombre} ${expSeleccionado.apellido} (${expSeleccionado.folio})`, 18, inicio + 9)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}`, 18, inicio + 16)
    let y = inicio + 30
    doc.setFontSize(10)
    doc.setFillColor('#e8f0f8')
    doc.rect(18, y - 6, 174, 9, 'F')
    doc.text('Concepto', 20, y)
    doc.text('Cant.', 104, y)
    doc.text('Precio', 125, y)
    doc.text('Descuento', 153, y)
    doc.text('Total', 178, y)
    y += 10
    for (const item of expSeleccionado.planTratamiento) {
      if (y > 275) { doc.addPage(); y = 20 }
      const subtotal = Number(item.subtotal) * (1 - Number(item.descuentoPct) / 100)
      doc.text(doc.splitTextToSize(item.concepto, 78), 20, y)
      doc.text(String(Number(item.cantidad)), 104, y)
      doc.text(fmt(Number(item.precioUnitario)), 125, y)
      doc.text(`${Number(item.descuentoPct)}%`, 153, y)
      doc.text(fmt(subtotal), 178, y)
      y += 8
    }
    doc.line(18, y, 192, y)
    doc.setFontSize(13)
    doc.text(`Total del presupuesto: ${fmt(expSeleccionado.totalPresupuesto)}`, 110, y + 10)
    doc.setFontSize(10)
    doc.text(`Pagado: ${fmt(expSeleccionado.totalPagado)}`, 110, y + 18)
    doc.text(`Saldo pendiente: ${fmt(expSeleccionado.saldoPendiente)}`, 110, y + 26)
    doc.save(`presupuesto-${expSeleccionado.folio}.pdf`)
  }

  const totalMonto = pagos.filter(p => p.estado === 'activo').reduce((a, p) => a + Number(p.monto), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora', fontSize: 22, fontWeight: 700 }}>Facturación</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            Registro de cobros y recibos — {total} pagos
          </p>
        </div>
        <div style={{
          background: '#e8f8ee', border: '1px solid #b6e5c8', borderRadius: 10,
          padding: '10px 16px', textAlign: 'right',
        }}>
          <div style={{ fontSize: 11, color: '#1a9e5c', marginBottom: 2 }}>Cobrado esta vista</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a9e5c' }}>{fmt(totalMonto)}</div>
        </div>
      </div>

      {/* Selector de vista — Pagos (recibos ya cobrados) / Presupuestos (plan de tratamiento) */}
      <div className="tabs-bar" style={{ marginBottom: 20 }}>
        <button className={`tab-btn${vista === 'pagos' ? ' active' : ''}`} onClick={() => setVista('pagos')}>
          <i className="ti ti-cash" style={{ marginRight: 6 }} />Pagos
        </button>
        <button className={`tab-btn${vista === 'presupuestos' ? ' active' : ''}`} onClick={() => setVista('presupuestos')}>
          <i className="ti ti-list-check" style={{ marginRight: 6 }} />Presupuestos
        </button>
      </div>

      {vista === 'pagos' && (loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando...</p>
      ) : pagos.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <i className="ti ti-cash-off" style={{ fontSize: 32, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }} />
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Sin pagos registrados</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Concepto</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pagos.map(pago => (
                <tr key={pago.id} style={{ opacity: pago.estado === 'anulado' ? 0.5 : 1 }}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{pago.folioRecibo}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtFecha(pago.createdAt)}</td>
                  <td>
                    {pago.expediente ? (
                      <span style={{ fontSize: 13 }}>
                        {pago.expediente.nombre} {pago.expediente.apellido}
                        <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{pago.expediente.folio}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{fmt(Number(pago.monto))}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                      <i className={`ti ${metodoIcon[pago.metodoPago]}`} />
                      {pago.metodoPago.charAt(0).toUpperCase() + pago.metodoPago.slice(1)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{pago.concepto ?? '—'}</td>
                  <td>
                    <span className={`pill ${pago.estado === 'activo' ? 'pill-green' : 'pill-red'}`}>
                      {pago.estado}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => generarRecibo(pago)}
                        title="Descargar recibo PDF"
                      >
                        <i className="ti ti-printer" />
                      </button>
                      {session?.rol === 'admin' && pago.estado === 'activo' && (
                        <button className="btn btn-danger btn-sm" onClick={() => anularPago(pago.id)}>
                          <i className="ti ti-ban" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {vista === 'pagos' && totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <i className="ti ti-chevron-left" />
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Página {page} de {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <i className="ti ti-chevron-right" />
          </button>
        </div>
      )}

      {/* ── Vista: Presupuestos (anidado desde el expediente para tenerlo más a la mano) ── */}
      {vista === 'presupuestos' && (
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Buscar paciente</p>
            <div style={{ display: 'flex', gap: 10, maxWidth: 420 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  className="form-input"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') explorarPacientes() }}
                  placeholder="Nombre, apellido o folio del expediente..."
                />
                {buscando && (
                  <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 12, color: 'var(--text-muted)' }}>Buscando...</span>
                )}
                {resultadosBusqueda.length > 0 && (
                  <div className="card" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                    zIndex: 10, maxHeight: 260, overflowY: 'auto', padding: 4,
                  }}>
                    {resultadosBusqueda.map(r => (
                      <div key={r.id} onClick={() => { setBusqueda(''); cargarPresupuesto(r.id) }}
                        style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: 6, fontSize: 13.5, display: 'flex', justifyContent: 'space-between' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                      >
                        <span>{r.nombre} {r.apellido}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{r.folio}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                title="Ver todos los pacientes"
                onClick={explorarPacientes}
              >
                <i className="ti ti-search" />
              </button>
            </div>
          </div>

          {cargandoExp ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando presupuesto...</p>
          ) : !expSeleccionado ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <i className="ti ti-list-check" style={{ fontSize: 32, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }} />
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Busca un paciente arriba para ver su plan de tratamiento y saldo</p>
            </div>
          ) : (
            <div>
              <div className="card" style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{expSeleccionado.nombre} {expSeleccionado.apellido}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{expSeleccionado.folio}</div>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  {[
                    { label: 'Presupuesto', value: fmt(expSeleccionado.totalPresupuesto), color: 'var(--text-main)' },
                    { label: 'Pagado', value: fmt(expSeleccionado.totalPagado), color: '#1a9e5c' },
                    { label: 'Saldo', value: fmt(expSeleccionado.saldoPendiente), color: expSeleccionado.saldoPendiente > 0 ? '#c0392b' : '#1a9e5c' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', background: 'var(--surface)', borderRadius: 10, padding: '8px 14px', minWidth: 90 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{s.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={descargarPresupuesto} title="Descargar desglose del presupuesto">
                    <i className="ti ti-file-download" /> PDF
                  </button>
                </div>
              </div>

              {expSeleccionado.planTratamiento.length === 0 ? (
                <div className="card" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Este paciente aún no tiene ítems en su plan de tratamiento</p>
                </div>
              ) : (
                <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
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
                      </tr>
                    </thead>
                    <tbody>
                      {expSeleccionado.planTratamiento.map(pt => {
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
                              <span className={`pill ${pt.estado === 'realizado' ? 'pill-green' : pt.estado === 'en_curso' ? 'pill-blue' : 'pill-amber'}`}>
                                {pt.estado}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="card" style={{ padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Registrar pago</p>
                <p style={{ fontSize: 13, color: '#1a9e5c', marginBottom: 12 }}>
                  Saldo pendiente: <strong>{fmt(expSeleccionado.saldoPendiente)}</strong>
                </p>
                <form onSubmit={registrarPagoDesdeFacturacion}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label className="form-label">Monto (MXN)</label>
                      <input className="form-input" type="number" min="0.01" step="0.01" max={expSeleccionado.saldoPendiente} required
                        value={nuevoPago.monto} onChange={e => setNuevoPago(f => ({ ...f, monto: e.target.value }))} placeholder="500.00" />
                    </div>
                    <div>
                      <label className="form-label">Método</label>
                      <select className="form-select" value={nuevoPago.metodoPago} onChange={e => setNuevoPago(f => ({ ...f, metodoPago: e.target.value as any }))}>
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta">Tarjeta</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Concepto</label>
                      <input className="form-input" value={nuevoPago.concepto} onChange={e => setNuevoPago(f => ({ ...f, concepto: e.target.value }))} placeholder="Abono consulta..." />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={savingPago || expSeleccionado.saldoPendiente <= 0}>
                    <i className="ti ti-cash" /> {savingPago ? 'Registrando...' : 'Registrar pago'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
