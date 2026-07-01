'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import CalendarGrid from '@/components/agenda/CalendarGrid'
import AppointmentModal from '@/components/agenda/AppointmentModal'
import type { Cita, Usuario } from '@/types'

interface SessionInfo { id: number; rol: string }

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AgendaPage() {
  const searchParams = useSearchParams()
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [doctoras, setDoctoras] = useState<Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'colorAgenda'>[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [citas, setCitas] = useState<Cita[]>([])
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCita, setEditingCita] = useState<Cita | null>(null)
  const [loading, setLoading] = useState(true)

  // Cargar sesión + doctoras
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.ok) setSession({ id: d.data.id, rol: d.data.rol })
    })
    fetch('/api/usuarios/doctoras').then(r => r.json()).then(d => {
      if (d.ok) setDoctoras(d.data)
    })
  }, [])

  const loadCitas = useCallback(async () => {
    setLoading(true)
    try {
      const mes = `${year}-${String(month + 1).padStart(2, '0')}`
      const res = await fetch(`/api/citas?mes=${mes}&pageSize=500`)
      const data = await res.json()
      if (data.ok) setCitas(data.data)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { loadCitas() }, [loadCitas])

  // Abrir modal "nueva cita" si viene ?nueva=1 en la URL
  useEffect(() => {
    if (searchParams.get('nueva') === '1') {
      setEditingCita(null)
      setModalOpen(true)
    }
  }, [searchParams])

  const citasByDay = useMemo(() => {
    const map: Record<string, Cita[]> = {}
    for (const c of citas) {
      const key = c.fecha.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(c)
    }
    return map
  }, [citas])

  const citasDelDia = citasByDay[selectedDate] ?? []

  function changeMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonth(m)
    setYear(y)
  }

  function formatHora(hora: string) {
    return hora
  }

  function formatSelectedDateLabel() {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const esHoy = selectedDate === todayKey()
    const label = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    return esHoy ? `Hoy · ${label}` : label
  }

  function openEdit(cita: Cita) {
    setEditingCita(cita)
    setModalOpen(true)
  }

  function openNew() {
    setEditingCita(null)
    setModalOpen(true)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora', fontSize: 22, fontWeight: 700 }}>Agenda</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            Calendario compartido — todas las doctoras
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <i className="ti ti-plus" /> Anotar cita
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => changeMonth(-1)} style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <i className="ti ti-chevron-left" />
          </button>
          <span style={{ fontFamily: 'Sora', fontSize: 17, fontWeight: 700, minWidth: 180, textAlign: 'center' }}>
            {MESES[month]} {year}
          </span>
          <button onClick={() => changeMonth(1)} style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <i className="ti ti-chevron-right" />
          </button>
          <button onClick={() => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth()); setSelectedDate(todayKey()) }}
            className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }}>
            Hoy
          </button>
        </div>

        {/* Leyenda de doctoras */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {doctoras.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.colorAgenda ?? '#999' }} />
              {d.nombre} {d.apellido}
            </div>
          ))}
        </div>
      </div>

      {/* Calendario */}
      <CalendarGrid
        year={year} month={month}
        citasByDay={citasByDay}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {/* Lista del día seleccionado */}
      <div style={{ marginTop: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 14 }}>
          Citas del día — {formatSelectedDateLabel()}
        </p>

        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando...</p>
        ) : citasDelDia.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
            <i className="ti ti-calendar-off" style={{ fontSize: 32, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }} />
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>No hay citas para este día</p>
          </div>
        ) : citasDelDia
            .sort((a, b) => a.hora.localeCompare(b.hora))
            .map(cita => (
              <div key={cita.id} className="card" style={{
                marginBottom: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer',
              }}
                onClick={() => openEdit(cita)}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue-accent)', minWidth: 50 }}>
                  {formatHora(cita.hora)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{cita.nombrePaciente} {cita.apellidoPaciente}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cita.asunto}</div>
                </div>
                <span className="pill" style={{
                  marginLeft: 'auto',
                  background: cita.doctora?.colorAgenda ? `${cita.doctora.colorAgenda}22` : '#dbeafe',
                  color: cita.doctora?.colorAgenda ?? '#1e40af',
                }}>
                  {cita.doctora?.nombre}
                </span>
                <span className={`pill ${
                  cita.estado === 'confirmada' ? 'pill-green'
                  : cita.estado === 'completada' ? 'pill-blue'
                  : cita.estado === 'cancelada' ? 'pill-red'
                  : 'pill-amber'
                }`}>
                  {cita.estado}
                </span>
              </div>
            ))
        }
      </div>

      {session && (
        <AppointmentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={loadCitas}
          defaultDate={selectedDate}
          doctoras={doctoras}
          currentUserId={session.id}
          currentUserRol={session.rol}
          editingCita={editingCita}
        />
      )}
    </div>
  )
}
