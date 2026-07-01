'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import NewExpedienteModal from '@/components/expedientes/NewExpedienteModal'
import type { Expediente, Usuario } from '@/types'

interface SessionInfo { id: number; rol: string }

export default function ExpedientesListPage() {
  const searchParams = useSearchParams()
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [doctoras, setDoctoras] = useState<Pick<Usuario, 'id' | 'nombre' | 'apellido'>[]>([])
  const [expedientes, setExpedientes] = useState<Expediente[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.ok) setSession({ id: d.data.id, rol: d.data.rol }) })
    fetch('/api/usuarios/doctoras').then(r => r.json()).then(d => { if (d.ok) setDoctoras(d.data) })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}&pageSize=100` : '?pageSize=100'
      const res = await fetch(`/api/expedientes${qs}`)
      const data = await res.json()
      if (data.ok) setExpedientes(data.data)
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (searchParams.get('nuevo') === '1') setModalOpen(true)
  }, [searchParams])

  function edad(fechaNacimiento: string | null) {
    if (!fechaNacimiento) return null
    const hoy = new Date()
    const nac = new Date(fechaNacimiento)
    let years = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) years--
    return years
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora', fontSize: 22, fontWeight: 700 }}>Expedientes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Historial clínico, odontograma y presupuesto</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <i className="ti ti-plus" /> Nuevo expediente
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <input
          className="form-input"
          placeholder="Buscar por nombre, folio o teléfono…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <button className="btn btn-secondary" onClick={load}><i className="ti ti-search" /></button>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando...</p>
      ) : expedientes.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <i className="ti ti-folder-off" style={{ fontSize: 32, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }} />
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>No se encontraron expedientes</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Paciente</th>
                <th>Edad</th>
                <th>Teléfono</th>
                <th>Doctora</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expedientes.map(exp => (
                <tr key={exp.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{exp.folio}</td>
                  <td style={{ fontWeight: 500 }}>{exp.nombre} {exp.apellido}</td>
                  <td>{edad(exp.fechaNacimiento) ?? '—'}</td>
                  <td>{exp.telefono ?? '—'}</td>
                  <td>{exp.doctora ? `${exp.doctora.nombre} ${exp.doctora.apellido}` : '—'}</td>
                  <td>
                    <span className={`pill ${exp.estado === 'activo' ? 'pill-green' : 'pill-gray'}`}>{exp.estado}</span>
                  </td>
                  <td>
                    <Link href={`/expedientes/${exp.id}`} style={{ fontSize: 12.5, color: 'var(--blue-accent)', fontWeight: 500, textDecoration: 'none' }}>
                      Ver expediente →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {session && (
        <NewExpedienteModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={load}
          doctoras={doctoras}
          currentUserId={session.id}
          currentUserRol={session.rol}
        />
      )}
    </div>
  )
}
