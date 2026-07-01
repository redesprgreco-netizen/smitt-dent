'use client'
import { useState, useEffect, useCallback } from 'react'
import type { BitacoraEntry } from '@/types'

export default function BitacoraPage() {
  const [entries, setEntries] = useState<BitacoraEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bitacora?page=${page}&pageSize=30`)
      const data = await res.json()
      if (data.ok) {
        setEntries(data.data)
        setTotalPages(data.totalPages)
      }
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
  }

  function accionColor(accion: string) {
    if (accion.includes('eliminar') || accion.includes('anular') || accion.includes('desactivar')) return 'pill-red'
    if (accion.includes('crear') || accion.includes('aprobar')) return 'pill-green'
    if (accion.includes('editar') || accion.includes('actualizar')) return 'pill-blue'
    return 'pill-gray'
  }

  return (
    <div style={{ marginTop: 20 }}>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando...</p>
      ) : entries.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <i className="ti ti-history" style={{ fontSize: 32, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }} />
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Aún no hay registros de actividad</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Tabla</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatFecha(e.createdAt)}</td>
                  <td>{e.usuario ? `${e.usuario.nombre} ${e.usuario.apellido}` : '—'}</td>
                  <td><span className={`pill ${accionColor(e.accion)}`}>{e.accion}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{e.tablaAfectada}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{e.registroId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <i className="ti ti-chevron-left" />
          </button>
          <span style={{ fontSize: 13, alignSelf: 'center', color: 'var(--text-muted)' }}>
            Página {page} de {totalPages}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <i className="ti ti-chevron-right" />
          </button>
        </div>
      )}
    </div>
  )
}
