'use client'
// Vista de día: una columna por doctora, filas por hora.
// Clic en una cita la abre; clic en un hueco vacío agenda a esa hora.
import type { Cita, Usuario } from '@/types'

type Doctora = Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'colorAgenda'>

interface DayViewProps {
  citas: Cita[]
  doctoras: Doctora[]
  isToday: boolean
  onOpenCita: (cita: Cita) => void
  onCreateAt: (hora: string) => void
}

const HORA_INICIO = 8
const HORA_FIN = 19 // última fila visible: 19:00–19:59

const horaDe = (c: Cita) => parseInt((c.hora ?? '0').split(':')[0] || '0', 10)

export default function DayView({ citas, doctoras, isToday, onOpenCita, onCreateAt }: DayViewProps) {
  // Columna extra solo si hay citas sin doctora asignada
  const idsConocidos = new Set(doctoras.map(d => d.id))
  const huerfanas = citas.filter(c => c.doctoraId == null || !idsConocidos.has(c.doctoraId))
  const columnas: { id: number | null; titulo: string; color: string }[] = [
    ...doctoras.map(d => ({ id: d.id, titulo: `Dra. ${d.nombre}`, color: d.colorAgenda ?? '#999' })),
    ...(huerfanas.length > 0 ? [{ id: null, titulo: 'Sin asignar', color: '#999' }] : []),
  ]

  // Ampliar el rango si hay citas fuera del horario habitual
  const horas = citas.map(horaDe)
  const desde = Math.min(HORA_INICIO, ...horas)
  const hasta = Math.max(HORA_FIN, ...horas)
  const filas = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i)

  const horaActual = isToday ? new Date().getHours() : -1

  function citasEn(hora: number, colId: number | null) {
    return citas.filter(c => {
      if (horaDe(c) !== hora) return false
      if (colId === null) return c.doctoraId == null || !idsConocidos.has(c.doctoraId)
      return c.doctoraId === colId
    })
  }

  return (
    <div className="dayview card">
      <div
        className="dayview-grid"
        style={{ gridTemplateColumns: `56px repeat(${Math.max(columnas.length, 1)}, minmax(170px, 1fr))` }}
      >
        {/* Encabezados */}
        <div className="dayview-corner" />
        {columnas.map(col => (
          <div key={col.id ?? 'sin'} className="dayview-colhead">
            <span className="dayview-dot" style={{ background: col.color }} />
            {col.titulo}
          </div>
        ))}

        {/* Filas por hora */}
        {filas.map(h => (
          <div key={h} style={{ display: 'contents' }}>
            <div className={`dayview-hour${h === horaActual ? ' now' : ''}`}>{String(h).padStart(2, '0')}:00</div>
            {columnas.map(col => {
              const items = citasEn(h, col.id)
              return (
                <div
                  key={`${h}-${col.id ?? 'sin'}`}
                  className={`dayview-cell${h === horaActual ? ' now' : ''}`}
                  onClick={() => items.length === 0 && col.id !== null && onCreateAt(`${String(h).padStart(2, '0')}:00`)}
                  role={items.length === 0 ? 'button' : undefined}
                  aria-label={items.length === 0 ? `Agendar a las ${String(h).padStart(2, '0')}:00` : undefined}
                >
                  {items.length === 0 && col.id !== null && <span className="dayview-add"><i className="ti ti-plus" /></span>}
                  {items.map(c => {
                    const color = c.medicoTemporalColor ?? c.doctora?.colorAgenda ?? col.color
                    return (
                      <button
                        key={c.id}
                        className={`dayview-appt${c.estado === 'cancelada' ? ' cancelled' : ''}`}
                        style={{ borderLeftColor: color, background: `${color}1a` }}
                        onClick={e => { e.stopPropagation(); onOpenCita(c) }}
                      >
                        <span className="dayview-appt-top">
                          <strong>{c.hora}</strong>
                          <span className={`dayview-status s-${c.estado}`}>{c.estado}</span>
                        </span>
                        <span className="dayview-appt-name">{c.nombrePaciente} {c.apellidoPaciente}</span>
                        <span className="dayview-appt-sub">
                          {c.asunto}{c.medicoTemporalNombre ? ` · Temporal: ${c.medicoTemporalNombre}` : ''}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
