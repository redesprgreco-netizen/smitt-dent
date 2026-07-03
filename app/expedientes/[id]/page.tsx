'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Odontograma from '@/components/odontograma/Odontograma'
import FichaClinica from '@/components/expedientes/FichaClinica'
import type { Expediente, HistorialClinico, PlanTratamiento, Pago, AntecedentesPatologicos, ConsentimientoInformado } from '@/types'

type Tab = 'ficha' | 'historial' | 'odontograma' | 'presupuesto' | 'pagos'

interface ExpedienteDetalle extends Expediente {
  historial: HistorialClinico[]
  planTratamiento: PlanTratamiento[]
  pagos: Pago[]
  antecedentes: AntecedentesPatologicos | null
  consentimiento: ConsentimientoInformado | null
  totalPresupuesto: number
  totalPagado: number
  saldoPendiente: number
}

export default function ExpedienteDetallePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [tab, setTab] = useState<Tab>('ficha')
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

  // Estados para Plan de Pagos
  const [montoTotalManual, setMontoTotalManual] = useState('')
  const [numeroPagosPlan, setNumeroPagosPlan] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.ok) setSession({ id: d.data.id, rol: d.data.rol }) })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/expedientes/${id}`)
      const data = await res.json()
      if (!res.ok) { router.push('/expedientes'); return }
      if (data.ok) {
        setExp(data.data)
        // Inicializar valores del plan de pagos
        setMontoTotalManual(data.data.montoTotalManual?.toString() || '')
        setNumeroPagosPlan(data.data.numeroPagosPlan?.toString() || '')
      }
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

  // Guardar Plan de Pagos
  async function guardarPlanPagos() {
    const res = await fetch(`/api/expedientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        montoTotalManual: montoTotalManual ? parseFloat(montoTotalManual) : null,
        numeroPagosPlan: numeroPagosPlan ? parseInt(numeroPagosPlan) : null,
      }),
    })
    if (res.ok) load()
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
      if (res.ok) { 
        setNuevoPago({ monto: '', metodoPago: 'efectivo', concepto: '' }); 
        load() 
      } else {
        const error = await res.json()
        alert(error.message || 'Error al registrar pago')
      }
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
      {/* ... (Breadcrumb y Header del paciente se mantienen igual) ... */}

      {/* Tabs - igual */}

      {/* Tab: Plan de tratamiento */}
      {tab === 'presupuesto' && (
        <div>
          {/* === NUEVO: Plan de Pagos === */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Plan de Pagos (Total y Cuotas)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label className="form-label">Total a Cobrar (MXN)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={montoTotalManual} 
                  onChange={(e) => setMontoTotalManual(e.target.value)}
                  placeholder="15000.00" 
                />
              </div>
              <div>
                <label className="form-label">Número de Pagos</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={numeroPagosPlan} 
                  onChange={(e) => setNumeroPagosPlan(e.target.value)}
                  placeholder="3" 
                />
              </div>
              <button className="btn btn-primary btn-sm" onClick={guardarPlanPagos}>
                Guardar Plan
              </button>
            </div>
          </div>

          {/* Formulario de agregar ítem (se mantiene igual) */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            {/* ... tu formulario de agregarPieza original ... */}
          </div>

          {/* Tabla de ítems (se mantiene igual) */}
          {exp.planTratamiento.length === 0 ? (
            // ... igual
          ) : (
            // ... tabla igual
          )}
        </div>
      )}

      {/* Tab: Pagos */}
      {tab === 'pagos' && (
        <div>
          {/* Resumen - igual */}

          {/* Registrar pago - Mejorado */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Registrar pago</p>
            <p style={{ fontSize: 13, color: '#1a9e5c', marginBottom: 12 }}>
              Saldo pendiente: <strong>{fmt(exp.saldoPendiente)}</strong>
            </p>
            <form onSubmit={registrarPago}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label">Monto (MXN)</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    min="0.01" 
                    step="0.01" 
                    max={exp.saldoPendiente}
                    required 
                    value={nuevoPago.monto}
                    onChange={e => setNuevoPago(f => ({ ...f, monto: e.target.value }))} 
                    placeholder="500.00" 
                  />
                </div>
                <div>
                  <label className="form-label">Método de pago</label>
                  <select className="form-select" value={nuevoPago.metodoPago}
                    onChange={e => setNuevoPago(f => ({ ...f, metodoPago: e.target.value as any }))}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Concepto (opcional)</label>
                  <input className="form-input" value={nuevoPago.concepto}
                    onChange={e => setNuevoPago(f => ({ ...f, concepto: e.target.value }))} placeholder="Abono consulta..." />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingPago || exp.saldoPendiente <= 0}>
                <i className="ti ti-cash" /> {savingPago ? 'Registrando...' : 'Registrar pago'}
              </button>
              {exp.saldoPendiente <= 0 && <p style={{color: '#1a9e5c', marginTop: 8}}>✅ Deuda saldada</p>}
            </form>
          </div>

          {/* Lista de pagos - igual */}
          {exp.pagos.length === 0 ? (
            // ...
          ) : (
            // tabla igual
          )}
        </div>
      )}
    </div>
  )
}