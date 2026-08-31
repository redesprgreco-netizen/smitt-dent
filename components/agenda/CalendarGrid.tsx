'use client'
import type { Cita } from '@/types'

interface CalendarGridProps {
  year: number
  month: number // 0-11
  citasByDay: Record<string, Cita[]> // key: 'YYYY-MM-DD'
  selectedDate: string
  onSelectDate: (date: string) => void
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseHoraToMinutes(hora: string | null | undefined) {
  if (!hora) return 24 * 60
  const [hh = '0', mm = '0'] = hora.split(':')
  return Number(hh) * 60 + Number(mm)
}

function sortCitasPorHora(a: Cita, b: Cita) {
  return parseHoraToMinutes(a.hora) - parseHoraToMinutes(b.hora)
}

export default function CalendarGrid({ year, month, citasByDay, selectedDate, onSelectDate }: CalendarGridProps) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const todayKey = toKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const cells: { day: number; key: string; otherMonth: boolean }[] = []

  // Días del mes anterior
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    cells.push({ day, key: toKey(y, m, day), otherMonth: true })
  }
  // Días del mes actual
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: toKey(year, month, d), otherMonth: false })
  }
  // Completar hasta múltiplo de 7
  let next = 1
  while (cells.length % 7 !== 0) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    cells.push({ day: next, key: toKey(y, m, next), otherMonth: true })
    next++
  }

  return (
    <div className="card calendar-shell">
      {/* Header días */}
      <div className="calendar-grid-content calendar-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {DIAS.map(d => (
          <div key={d} className="calendar-weekday" style={{
            textAlign: 'center', padding: '10px 4px', fontSize: 12,
            fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)',
          }}>{d}</div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="calendar-grid-content calendar-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {cells.map((cell, i) => {
          const citas = [...(citasByDay[cell.key] ?? [])].sort(sortCitasPorHora)
          const isToday = cell.key === todayKey
          const isSelected = cell.key === selectedDate

          return (
            <div
              key={i}
              onClick={() => onSelectDate(cell.key)}
              className="calendar-day"
              style={{
                borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                borderBottom: '1px solid var(--border)',
                padding: 6,
                cursor: 'pointer',
                position: 'relative',
                background: isSelected ? '#eaf2ff' : isToday ? '#f0f6ff' : undefined,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f8faff' }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isToday ? '#f0f6ff' : '' }}
            >
              <div style={{
                fontSize: 12, fontWeight: 600, marginBottom: 4,
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: cell.otherMonth ? '#c5cfe8' : 'var(--text-main)',
                background: isToday ? 'var(--blue-accent)' : undefined,
                borderRadius: isToday ? '50%' : undefined,
                ...(isToday && { color: '#fff' }),
              }}>
                {cell.day}
              </div>

              {citas.slice(0, 3).map(cita => {
                const color = cita.medicoTemporalColor ?? cita.doctora?.colorAgenda ?? '#2563eb'
                const isTemporal = Boolean(cita.medicoTemporalNombre)
                return (
                  <div
                    key={cita.id}
                    className="calendar-appointment"
                    title={`${cita.nombrePaciente} ${cita.apellidoPaciente} — ${cita.asunto}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                      minHeight: 12, marginBottom: 4, padding: 0,
                      background: 'transparent', color: color,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 9, height: 9, display: 'inline-block',
                        background: color,
                        borderRadius: isTemporal ? 2 : '50%',
                        transform: isTemporal ? 'rotate(45deg)' : 'none',
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.6)',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                )
              })}
              {citas.length > 3 && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  +{citas.length - 3} más
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
