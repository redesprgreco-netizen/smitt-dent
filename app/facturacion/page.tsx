'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Pago } from '@/types'

export default function FacturacionPage() {
  const searchParams = useSearchParams()
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [session, setSession] = useState<{ id: number; rol: string } | null>(null)

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

  function generarRecibo(pago: Pago) {
    // Abrir ventana de impresión con el recibo
    const w = window.open('', '_blank', 'width=600,height=700')
    if (!w) return
    const paciente = pago.expediente
      ? `${pago.expediente.nombre} ${pago.expediente.apellido} (${pago.expediente.folio})`
      : '—'
    const fecha = new Date(pago.createdAt).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })
    w.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8"/>
      <title>Recibo ${pago.folioRecibo}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #0d2b55; }
        h1 { font-size: 22px; margin: 0; }
        .folio { color: #6b7fa3; font-size: 13px; margin-top: 4px; }
        hr { border: none; border-top: 2px solid #dce5f0; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px 0; font-size: 14px; }
        td:last-child { text-align: right; font-weight: 600; }
        .total { font-size: 22px; font-weight: 700; color: #0d2b55; }
        .footer { margin-top: 40px; font-size: 12px; color: #6b7fa3; text-align: center; }
        @media print { button { display: none; } }
      </style></head><body>
      <h1>SmittDent</h1>
      <div class="folio">Recibo de pago</div>
      <hr/>
      <table>
        <tr><td>Folio</td><td>${pago.folioRecibo}</td></tr>
        <tr><td>Paciente</td><td>${paciente}</td></tr>
        <tr><td>Fecha</td><td>${fecha}</td></tr>
        <tr><td>Concepto</td><td>${pago.concepto ?? 'Pago de servicios dentales'}</td></tr>
        <tr><td>Método de pago</td><td>${pago.metodoPago.charAt(0).toUpperCase() + pago.metodoPago.slice(1)}</td></tr>
      </table>
      <hr/>
      <table><tr><td>TOTAL PAGADO</td><td class="total">${fmt(Number(pago.monto))}</td></tr></table>
      <div class="footer">Este documento es un comprobante de pago.<br/>Gracias por su preferencia.</div>
      <br/><button onclick="window.print()">🖨️ Imprimir recibo</button>
      </body></html>
    `)
    w.document.close()
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

      {loading ? (
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
                        title="Ver/imprimir recibo"
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
      )}

      {totalPages > 1 && (
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
    </div>
  )
}
