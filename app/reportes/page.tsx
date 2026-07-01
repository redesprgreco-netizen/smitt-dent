'use client'
import { useState, useEffect } from 'react'

interface ResumenData {
  periodo: { desde: string; hasta: string }
  citas: { total: number; porEstado: { estado: string; _count: number }[] }
  expedientes: { nuevos: number }
  pagos: {
    totalMonto: number
    totalTransacciones: number
    porMetodo: { metodo: string; monto: number; cantidad: number }[]
  }
}

interface DoctoraPago {
  id: number
  doctora: string
  total_transacciones: number
  total_monto: number
}

export default function ReportesPage() {
  const [resumen, setResumen] = useState<ResumenData | null>(null)
  const [doctoras, setDoctoras] = useState<DoctoraPago[]>([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10))

  async function load() {
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/reportes?tipo=resumen&desde=${desde}&hasta=${hasta}`).then(r => r.json()),
        fetch(`/api/reportes?tipo=pagos-doctora&desde=${desde}&hasta=${hasta}`).then(r => r.json()),
      ])
      if (r1.ok) setResumen(r1.data)
      if (r2.ok) setDoctoras(r2.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  const estadoColor: Record<string, string> = {
    confirmada: '#1a9e5c', completada: '#2272d4',
    pendiente: '#c87d00', cancelada: '#c0392b',
  }

  const metodoLabel: Record<string, string> = {
    efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta',
  }

  async function exportarExcel() {
    if (!resumen) return
    // Generar CSV básico (xlsx requiere la lib que ya está en package.json)
    const rows = [
      ['Período', `${desde} al ${hasta}`],
      [],
      ['RESUMEN DE INGRESOS'],
      ['Total cobrado', resumen.pagos.totalMonto],
      ['Total transacciones', resumen.pagos.totalTransacciones],
      [],
      ['POR MÉTODO DE PAGO'],
      ['Método', 'Monto', 'Transacciones'],
      ...resumen.pagos.porMetodo.map(m => [metodoLabel[m.metodo] ?? m.metodo, m.monto, m.cantidad]),
      [],
      ['CITAS'],
      ['Total citas', resumen.citas.total],
      ...resumen.citas.porEstado.map(e => [e.estado, e._count]),
      [],
      ['EXPEDIENTES NUEVOS', resumen.expedientes.nuevos],
      [],
      ['POR DOCTORA'],
      ['Doctora', 'Transacciones', 'Monto'],
      ...doctoras.map(d => [d.doctora, d.total_transacciones, d.total_monto]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `smittdent-reporte-${desde}-${hasta}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora', fontSize: 22, fontWeight: 700 }}>Reportes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Estadísticas y análisis — solo administración</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label">Desde</label>
            <input className="form-input" type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 150 }} />
          </div>
          <div>
            <label className="form-label">Hasta</label>
            <input className="form-input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 150 }} />
          </div>
          <button className="btn btn-primary" onClick={load} style={{ marginTop: 16 }} disabled={loading}>
            <i className="ti ti-refresh" /> {loading ? 'Cargando...' : 'Actualizar'}
          </button>
          <button className="btn btn-secondary" onClick={exportarExcel} style={{ marginTop: 16 }} disabled={!resumen}>
            <i className="ti ti-file-spreadsheet" /> Exportar CSV
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando reportes...</p>
      ) : !resumen ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Error al cargar datos</p>
      ) : (
        <div>
          {/* KPIs principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total cobrado', value: fmt(resumen.pagos.totalMonto), icon: 'ti-cash', color: '#1a9e5c', bg: '#e8f8ee' },
              { label: 'Transacciones', value: resumen.pagos.totalTransacciones, icon: 'ti-receipt', color: '#2272d4', bg: '#e8f1fb' },
              { label: 'Citas registradas', value: resumen.citas.total, icon: 'ti-calendar', color: '#00918a', bg: '#e0f7f6' },
              { label: 'Pacientes nuevos', value: resumen.expedientes.nuevos, icon: 'ti-user-plus', color: '#6c3fcf', bg: '#f0ecff' },
            ].map((kpi, i) => (
              <div key={i} className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{kpi.label}</span>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`ti ${kpi.icon}`} style={{ fontSize: 18, color: kpi.color }} />
                  </div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-main)' }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Pagos por método */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-chart-pie" style={{ color: 'var(--text-muted)' }} /> Ingresos por método de pago
              </p>
              {resumen.pagos.porMetodo.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin datos</p>
              ) : resumen.pagos.porMetodo.map(m => {
                const pct = resumen.pagos.totalMonto > 0 ? (m.monto / resumen.pagos.totalMonto) * 100 : 0
                const colores: Record<string, string> = { efectivo: '#1a9e5c', transferencia: '#2272d4', tarjeta: '#6c3fcf' }
                return (
                  <div key={m.metodo} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span>{metodoLabel[m.metodo] ?? m.metodo} ({m.cantidad} tx)</span>
                      <span style={{ fontWeight: 600 }}>{fmt(m.monto)}</span>
                    </div>
                    <div style={{ height: 8, background: '#eef1f8', borderRadius: 4 }}>
                      <div style={{ height: '100%', borderRadius: 4, background: colores[m.metodo] ?? '#999', width: `${pct}%`, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{pct.toFixed(1)}%</div>
                  </div>
                )
              })}
            </div>

            {/* Citas por estado */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-calendar-stats" style={{ color: 'var(--text-muted)' }} /> Citas por estado
              </p>
              {resumen.citas.porEstado.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin datos</p>
              ) : resumen.citas.porEstado.map(e => {
                const pct = resumen.citas.total > 0 ? (e._count / resumen.citas.total) * 100 : 0
                return (
                  <div key={e.estado} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ textTransform: 'capitalize' }}>{e.estado}</span>
                      <span style={{ fontWeight: 600 }}>{e._count}</span>
                    </div>
                    <div style={{ height: 8, background: '#eef1f8', borderRadius: 4 }}>
                      <div style={{ height: '100%', borderRadius: 4, background: estadoColor[e.estado] ?? '#999', width: `${pct}%`, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{pct.toFixed(1)}%</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Por doctora */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
              <i className="ti ti-stethoscope" style={{ marginRight: 8, color: 'var(--text-muted)' }} />
              Ingresos por doctora
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doctora</th>
                  <th>Transacciones</th>
                  <th>Total cobrado</th>
                  <th>% del total</th>
                </tr>
              </thead>
              <tbody>
                {doctoras.filter(d => d.total_transacciones > 0).map(d => {
                  const pct = resumen.pagos.totalMonto > 0 ? (d.total_monto / resumen.pagos.totalMonto) * 100 : 0
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 500 }}>{d.doctora}</td>
                      <td>{d.total_transacciones}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(d.total_monto)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 8, background: '#eef1f8', borderRadius: 4 }}>
                            <div style={{ height: '100%', borderRadius: 4, background: 'var(--blue-accent)', width: `${pct}%` }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 40 }}>{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
