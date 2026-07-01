'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Usuario, EstadoUsuario } from '@/types'

const COLORES = ['#2272d4', '#00918a', '#6c3fcf', '#d85a30', '#b03aaa', '#c87d00', '#1a9e5c', '#2a4daa']

export default function UsuariosPage() {
  const searchParams = useSearchParams()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [filtro, setFiltro] = useState<EstadoUsuario | 'todos'>(
    (searchParams.get('estado') as EstadoUsuario) || 'todos'
  )
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = filtro !== 'todos' ? `?estado=${filtro}&pageSize=100` : '?pageSize=100'
      const res = await fetch(`/api/usuarios${qs}`)
      const data = await res.json()
      if (data.ok) setUsuarios(data.data)
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => { load() }, [load])

  async function updateUsuario(id: number, body: Record<string, unknown>) {
    const res = await fetch(`/api/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...data.data } : u))
    } else {
      alert(data.error ?? 'Error al actualizar')
    }
  }

  const pendientes = usuarios.filter(u => u.estado === 'pendiente')
  const activos = usuarios.filter(u => u.estado === 'activo')
  const inactivos = usuarios.filter(u => u.estado === 'inactivo')

  function rolLabel(rol: string) {
    return rol === 'admin' ? 'Administradora' : rol === 'visitante' ? 'Visitante' : 'Doctora'
  }

  return (
    <div>
      {/* Filtros rápidos */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'todos', label: `Todos (${usuarios.length})` },
          { key: 'pendiente', label: `Pendientes (${pendientes.length})` },
          { key: 'activo', label: `Activos (${activos.length})` },
          { key: 'inactivo', label: `Inactivos (${inactivos.length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key as EstadoUsuario | 'todos')}
            className={filtro === f.key ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Aviso de pendientes */}
      {filtro === 'todos' && pendientes.length > 0 && (
        <div style={{
          background: '#fff4e0', border: '1px solid #f5d876', borderRadius: 10,
          padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <i className="ti ti-alert-circle" style={{ color: '#c87d00', fontSize: 18 }} />
          <span style={{ fontSize: 13.5, color: '#8a5d00' }}>
            Tienes <strong>{pendientes.length}</strong> solicitud{pendientes.length > 1 ? 'es' : ''} de acceso pendiente{pendientes.length > 1 ? 's' : ''} de aprobación
          </span>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando...</p>
      ) : usuarios.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>No hay usuarios en este filtro</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Color agenda</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.nombre} {u.apellido}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.correo}</td>
                  <td>
                    {editingId === u.id ? (
                      <select
                        className="form-select"
                        style={{ width: 140 }}
                        defaultValue={u.rol}
                        onChange={e => updateUsuario(u.id, { rol: e.target.value })}
                      >
                        <option value="doctora">Doctora</option>
                        <option value="visitante">Visitante</option>
                        <option value="admin">Administradora</option>
                      </select>
                    ) : (
                      <span className={`pill ${u.rol === 'admin' ? 'pill-blue' : 'pill-gray'}`}>
                        {rolLabel(u.rol)}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {COLORES.map(c => (
                        <div
                          key={c}
                          onClick={() => updateUsuario(u.id, { colorAgenda: c })}
                          style={{
                            width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer',
                            border: u.colorAgenda === c ? '2px solid var(--blue-dark)' : '2px solid transparent',
                          }}
                        />
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${
                      u.estado === 'activo' ? 'pill-green' : u.estado === 'pendiente' ? 'pill-amber' : 'pill-red'
                    }`}>
                      {u.estado}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {u.estado === 'pendiente' && (
                        <button className="btn btn-primary btn-sm" onClick={() => updateUsuario(u.id, { estado: 'activo' })}>
                          <i className="ti ti-check" /> Aprobar
                        </button>
                      )}
                      {u.estado === 'activo' && (
                        <button className="btn btn-danger btn-sm" onClick={() => {
                          if (confirm(`¿Desactivar a ${u.nombre} ${u.apellido}?`)) updateUsuario(u.id, { estado: 'inactivo' })
                        }}>
                          <i className="ti ti-user-off" /> Desactivar
                        </button>
                      )}
                      {u.estado === 'inactivo' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => updateUsuario(u.id, { estado: 'activo' })}>
                          <i className="ti ti-user-check" /> Reactivar
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(editingId === u.id ? null : u.id)}>
                        <i className="ti ti-edit" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
