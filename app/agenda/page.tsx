'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CalendarGrid from '@/components/agenda/CalendarGrid'
import AppointmentModal from '@/components/agenda/AppointmentModal'
import DayView from '@/components/agenda/DayView'
import PageHeader from '@/components/ui/PageHeader'
import type { Cita, Usuario } from '@/types'

interface SessionInfo { id: number; rol: string }
interface SolicitudCita {
  id: number
  nombrePaciente: string
  apellidoPaciente: string
  telefono: string
  correo: string | null
  fecha: string
  hora: string
  estado: 'pendiente' | 'confirmada'
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseHoraToMinutes(hora: string | null | undefined) {
  if (!hora) return 24 * 60
  const [hh = '0', mm = '0'] = hora.split(':')
  return Number(hh) * 60 + Number(mm)
}

function sortCitasPorHora(a: Cita, b: Cita) {
  return parseHoraToMinutes(a.hora) - parseHoraToMinutes(b.hora)
}

export default function AgendaPage() {
  const router = useRouter()
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
  const [view, setView] = useState<'dia' | 'mes'>('dia')
  const [newHora, setNewHora] = useState<string | undefined>(undefined)
  const [solicitudes, setSolicitudes] = useState<SolicitudCita[]>([])
  const [solicitudesLoading, setSolicitudesLoading] = useState(true)
  const [solicitudesError, setSolicitudesError] = useState('')
  const [gestionandoSolicitud, setGestionandoSolicitud] = useState<number | null>(null)

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
      const pageSize = 100
      const res = await fetch(`/api/citas?mes=${mes}&page=1&pageSize=${pageSize}`)
      if (res.status === 401) {
        router.replace('/login')
        return
      }

      const data = await res.json()
      if (!data.ok) return

      const citasMes = [...data.data]
      for (let page = 2; page <= data.totalPages; page++) {
        const pageRes = await fetch(`/api/citas?mes=${mes}&page=${page}&pageSize=${pageSize}`)
        if (pageRes.status === 401) {
          router.replace('/login')
          return
        }
        const pageData = await pageRes.json()
        if (!pageData.ok) return
        citasMes.push(...pageData.data)
      }
      setCitas(citasMes)
    } finally {
      setLoading(false)
    }
  }, [year, month, router])

  useEffect(() => { loadCitas() }, [loadCitas])

  const loadSolicitudes = useCallback(async () => {
    setSolicitudesLoading(true)
    try {
      const res = await fetch('/api/solicitudes-cita')
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setSolicitudesError(data.error ?? 'No se pudieron cargar las solicitudes.')
        return
      }
      setSolicitudesError('')
      setSolicitudes(data.data)
    } catch {
      setSolicitudesError('No se pudieron cargar las solicitudes.')
    } finally {
      setSolicitudesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.rol === 'admin') loadSolicitudes()
  }, [session, loadSolicitudes])

  async function gestionarSolicitud(id: number, accion: 'confirmar' | 'rechazar') {
    const pregunta = accion === 'confirmar'
      ? '¿Confirmar esta cita? Se agregará a la agenda y dejará de mostrarse como horario libre.'
      : '¿Rechazar esta solicitud?'
    if (!confirm(pregunta)) return

    setGestionandoSolicitud(id)
    setSolicitudesError('')
    try {
      const res = await fetch('/api/solicitudes-cita', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, accion }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setSolicitudesError(data.error ?? 'No se pudo actualizar la solicitud.')
        return
      }
      await Promise.all([loadSolicitudes(), accion === 'confirmar' ? loadCitas() : Promise.resolve()])
    } catch {
      setSolicitudesError('No se pudo actualizar la solicitud.')
    } finally {
      setGestionandoSolicitud(null)
    }
  }

  // Abrir modal "nueva cita" si viene ?nueva=1 en la URL
  useEffect(() => {
    if (searchParams.get('nueva') === '1') {
      setEditingCita(null)
      setNewHora(undefined)
      setModalOpen(true)
    }
  }, [searchParams])

  const citasByDay = useMemo(() => {
    const map: Record<string, Cita[]> = {}
    for (const c of [...citas].sort(sortCitasPorHora)) {
      const key = c.fecha.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(c)
    }
    return map
  }, [citas])

  const citasDelDia = useMemo(
    () => [...(citasByDay[selectedDate] ?? [])].sort(sortCitasPorHora),
    [citasByDay, selectedDate]
  )

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
    setNewHora(undefined)
    setModalOpen(true)
  }

  function openNewAt(hora: string) {
    setEditingCita(null)
    setNewHora(hora)
    setModalOpen(true)
  }

  // Navegación por día (mantiene mes/año sincronizados para cargar las citas correctas)
  function shiftDay(delta: number) {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const nueva = new Date(y, m - 1, d + delta)
    setSelectedDate(`${nueva.getFullYear()}-${String(nueva.getMonth() + 1).padStart(2, '0')}-${String(nueva.getDate()).padStart(2, '0')}`)
    setYear(nueva.getFullYear())
    setMonth(nueva.getMonth())
  }

  function switchToDay() {
    // Si el día seleccionado quedó fuera del mes que se está viendo, saltar a un día de ese mes
    const [sy, sm] = selectedDate.split('-').map(Number)
    if (sy !== year || sm - 1 !== month) {
      const hoy = new Date()
      setSelectedDate(
        hoy.getFullYear() === year && hoy.getMonth() === month
          ? todayKey()
          : `${year}-${String(month + 1).padStart(2, '0')}-01`
      )
    }
    setView('dia')
  }

  function goToday() {
    const hoy = new Date()
    setYear(hoy.getFullYear())
    setMonth(hoy.getMonth())
    setSelectedDate(todayKey())
  }

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Calendario compartido — todas las doctoras"
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <i className="ti ti-plus" /> Anotar cita
          </button>
        }
      />

      {session?.rol === 'admin' && (
        <section className="card" style={{ padding: 18, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>
              <i className="ti ti-calendar-question" style={{ marginRight: 7 }} />
              Solicitudes de cita en línea
            </h2>
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadSolicitudes}>
              <i className="ti ti-refresh" /> Actualizar
            </button>
          </div>
          {solicitudesError && (
            <p role="alert" style={{ color: '#a93226', fontSize: 13, marginBottom: 10 }}>{solicitudesError}</p>
          )}
          {solicitudesLoading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando solicitudes...</p>
          ) : solicitudes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay solicitudes pendientes.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {solicitudes.map(solicitud => (
                <div key={solicitud.id} style={{ border: '1px solid var(--border)', borderRadius: 9, padding: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 260px' }}>
                    <strong style={{ fontSize: 13.5 }}>{solicitud.nombrePaciente} {solicitud.apellidoPaciente}</strong>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                      {new Date(`${solicitud.fecha}T00:00:00.000Z`).toLocaleDateString('es-MX', { dateStyle: 'medium', timeZone: 'UTC' })} · {solicitud.hora}
                    </div>
                    <div style={{ fontSize: 12.5, marginTop: 4 }}>
                      <a href={`tel:${solicitud.telefono}`}>{solicitud.telefono}</a>
                      {solicitud.correo && <> · <a href={`mailto:${solicitud.correo}`}>{solicitud.correo}</a></>}
                    </div>
                  </div>
                  {solicitud.estado === 'pendiente' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn btn-primary btn-sm" disabled={gestionandoSolicitud === solicitud.id}
                        onClick={() => gestionarSolicitud(solicitud.id, 'confirmar')}>
                        <i className="ti ti-check" /> Confirmar
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={gestionandoSolicitud === solicitud.id}
                        onClick={() => gestionarSolicitud(solicitud.id, 'rechazar')}>
                        <i className="ti ti-x" /> Rechazar
                      </button>
                    </div>
                  ) : (
                    <span className="pill pill-green">Confirmada</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Barra de herramientas */}
      <div className="agenda-toolbar">
        <div className="agenda-nav">
          <button
            className="agenda-nav-btn"
            aria-label={view === 'dia' ? 'Día anterior' : 'Mes anterior'}
            onClick={() => (view === 'dia' ? shiftDay(-1) : changeMonth(-1))}
          >
            <i className="ti ti-chevron-left" />
          </button>
          <span className="agenda-nav-label">
            {view === 'dia' ? formatSelectedDateLabel() : `${MESES[month]} ${year}`}
          </span>
          <button
            className="agenda-nav-btn"
            aria-label={view === 'dia' ? 'Día siguiente' : 'Mes siguiente'}
            onClick={() => (view === 'dia' ? shiftDay(1) : changeMonth(1))}
          >
            <i className="ti ti-chevron-right" />
          </button>
          <button onClick={goToday} className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }}>
            Hoy
          </button>
        </div>

        <div className="seg-control" role="tablist" aria-label="Vista de la agenda">
          <button role="tab" aria-selected={view === 'dia'} className={view === 'dia' ? 'active' : ''} onClick={switchToDay}>
            <i className="ti ti-layout-rows" /> Día
          </button>
          <button role="tab" aria-selected={view === 'mes'} className={view === 'mes' ? 'active' : ''} onClick={() => setView('mes')}>
            <i className="ti ti-calendar-month" /> Mes
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

      {view === 'dia' ? (
        loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando...</p>
        ) : (
          <DayView
            citas={citasDelDia}
            doctoras={doctoras}
            isToday={selectedDate === todayKey()}
            onOpenCita={openEdit}
            onCreateAt={openNewAt}
          />
        )
      ) : (
        <>
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
            ) : citasDelDia.map(cita => (
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
                  {cita.medicoTemporalNombre && <div style={{ fontSize: 11.5, color: cita.medicoTemporalColor ?? '#e11d48', fontWeight: 600 }}>Médico temporal: {cita.medicoTemporalNombre}</div>}
                </div>
                <span className="pill" style={{
                  marginLeft: 'auto',
                  background: cita.medicoTemporalColor ? `${cita.medicoTemporalColor}22` : cita.doctora?.colorAgenda ? `${cita.doctora.colorAgenda}22` : '#dbeafe',
                  color: cita.medicoTemporalColor ?? cita.doctora?.colorAgenda ?? '#1e40af',
                }}>
                  {cita.doctora?.nombre ?? cita.doctoraNombre ?? 'Sin asignar'}
                </span>
                {cita.medicoTemporalNombre && <span className="pill" style={{ background: `${cita.medicoTemporalColor ?? '#e11d48'}22`, color: cita.medicoTemporalColor ?? '#e11d48', fontWeight: 700 }}>Temporal</span>}
                <span className={`pill ${
                  cita.estado === 'confirmada' ? 'pill-green'
                  : cita.estado === 'completada' ? 'pill-blue'
                  : cita.estado === 'cancelada' ? 'pill-red'
                  : 'pill-amber'
                }`}>
                  {cita.estado}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {session && (
        <AppointmentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={loadCitas}
          defaultDate={selectedDate}
          defaultHora={newHora}
          doctoras={doctoras}
          currentUserId={session.id}
          currentUserRol={session.rol}
          editingCita={editingCita}
        />
      )}
    </div>
  )
}
