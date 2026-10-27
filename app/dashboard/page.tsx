// app/dashboard/page.tsx
import { getSessionFromCookie } from '@/lib/auth'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'

const TZ = 'America/Mexico_City'

// "Hoy" se calcula con la fecha de Ciudad de México (no la del servidor), y se
// convierte a medianoche UTC porque así se guardan las citas (`fecha` @db.Date).
// Así el panel no se desfasa cuando el servidor corre en UTC (Vercel) por la tarde-noche.
function hoyMexico() {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).split('-').map(Number)
  return { y, m: m - 1, d }
}

function minutosAhoraMexico() {
  const txt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date())
  const [h, mi] = txt.split(':').map(Number)
  return h * 60 + mi
}

const hhmm = (h: Date | null) => (h ? new Date(h).toISOString().slice(11, 16) : '--:--')
const aMinutos = (h: Date | null) => {
  if (!h) return -1
  const [hh, mm] = hhmm(h).split(':').map(Number)
  return hh * 60 + mm
}

const fmtMonto = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const PILL_ESTADO: Record<string, string> = {
  confirmada: 'pill-green',
  completada: 'pill-blue',
  cancelada: 'pill-red',
  pendiente: 'pill-amber',
}

export default async function DashboardPage() {
  const session = await getSessionFromCookie()
  const esAdmin = session?.rol === 'admin'
  const soloMias = !esAdmin ? { doctoraId: session?.sub } : {}

  const { y, m, d } = hoyMexico()
  const hoy = new Date(Date.UTC(y, m, d))
  const manana = new Date(Date.UTC(y, m, d + 1))
  const diffLunes = (hoy.getUTCDay() + 6) % 7 // semana de lunes a domingo
  const inicioSemana = new Date(Date.UTC(y, m, d - diffLunes))
  const finSemana = new Date(Date.UTC(y, m, d - diffLunes + 7))
  const inicioMes = new Date(Date.UTC(y, m, 1))

  const [citasHoy, citasSemana, expedientesActivos, pagosMes, pendientesAprobacion] = await Promise.all([
    prisma.cita.findMany({
      where: { fecha: { gte: hoy, lt: manana }, estado: { not: 'cancelada' }, ...soloMias },
      include: { doctora: { select: { id: true, nombre: true, apellido: true, colorAgenda: true } } },
      orderBy: { hora: 'asc' },
      take: 40,
    }),
    prisma.cita.count({
      where: { fecha: { gte: inicioSemana, lt: finSemana }, estado: { not: 'cancelada' }, ...soloMias },
    }),
    prisma.expediente.count({ where: { estado: 'activo', ...soloMias } }),
    prisma.pago.aggregate({
      where: { estado: 'activo', createdAt: { gte: inicioMes, lt: manana } },
      _sum: { monto: true },
    }),
    esAdmin ? prisma.usuario.count({ where: { estado: 'pendiente' } }) : Promise.resolve(0),
  ])

  // La primera cita que aún no pasa (y no está completada) se marca como "Siguiente"
  const ahoraMin = minutosAhoraMexico()
  const idxSiguiente = citasHoy.findIndex(c => c.estado !== 'completada' && aMinutos(c.hora) >= ahoraMin)

  const pendientes = citasHoy.filter(c => c.estado !== 'completada').length

  const fechaTexto = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ,
  })

  const stats = [
    { label: 'Citas hoy',          value: String(citasHoy.length),               icon: 'ti-calendar-event', color: '#2272d4' },
    { label: 'Citas esta semana',  value: String(citasSemana),                   icon: 'ti-calendar-week',  color: '#6c3fcf' },
    { label: 'Expedientes activos', value: String(expedientesActivos),            icon: 'ti-folder-open',    color: '#00918a' },
    { label: 'Cobrado este mes',   value: fmtMonto(Number(pagosMes._sum.monto ?? 0)), icon: 'ti-cash',      color: '#1a9e5c' },
  ]

  const acciones = [
    { label: 'Nuevo expediente', sub: 'Registrar paciente', icon: 'ti-folder-plus', href: '/expedientes?nuevo=1', color: '#00918a', bg: '#e0f7f6' },
    { label: 'Registrar pago',   sub: 'Cobro rápido',       icon: 'ti-cash',        href: '/facturacion?nuevo=1', color: '#1a9e5c', bg: '#e8f8ee' },
    ...(esAdmin ? [{ label: 'Ver reportes', sub: 'Estadísticas del mes', icon: 'ti-chart-bar', href: '/reportes', color: '#6c3fcf', bg: '#f0ecff' }] : []),
  ]

  return (
    <div>
      <PageHeader
        title="Panel Principal"
        subtitle={<span style={{ textTransform: 'capitalize' }}>{fechaTexto}</span>}
        actions={
          <>
            <Link href="/expedientes?nuevo=1" className="btn btn-secondary">
              <i className="ti ti-folder-plus" /> Nuevo expediente
            </Link>
            <Link href="/agenda?nueva=1" className="btn btn-primary">
              <i className="ti ti-calendar-plus" /> Nueva cita
            </Link>
          </>
        }
      />

      <div className="dash-grid">
        {/* ── Columna principal: lo que hay que atender hoy ── */}
        <section className="card dash-main" aria-labelledby="citas-hoy">
          <div className="card-head">
            <h2 id="citas-hoy" className="card-title">
              <i className="ti ti-calendar-event" /> Citas de hoy
            </h2>
            <span className="card-aside">
              {citasHoy.length === 0 ? 'Sin citas' : `${pendientes} por atender · ${citasHoy.length} en total`}
            </span>
          </div>

          {citasHoy.length === 0 ? (
            <div className="empty-block">
              <i className="ti ti-calendar-off" />
              <p>No hay citas programadas para hoy</p>
              <Link href="/agenda?nueva=1" className="btn btn-secondary btn-sm">Agendar una cita</Link>
            </div>
          ) : (
            <ul className="appt-list">
              {citasHoy.map((cita, i) => {
                const color = cita.medicoTemporalColor ?? cita.doctora?.colorAgenda ?? 'var(--blue-accent)'
                const nombre = `${cita.nombrePaciente} ${cita.apellidoPaciente}`
                const esSiguiente = i === idxSiguiente
                return (
                  <li key={cita.id} className={`appt-row${esSiguiente ? ' next' : ''}${cita.estado === 'completada' ? ' done' : ''}`}>
                    <span className="appt-bar" style={{ background: color }} />
                    <span className="appt-time">{hhmm(cita.hora)}</span>
                    <div className="appt-body">
                      <div className="appt-name">
                        {cita.expedienteId
                          ? <Link href={`/expedientes/${cita.expedienteId}`}>{nombre}</Link>
                          : nombre}
                        {esSiguiente && <span className="pill pill-blue" style={{ marginLeft: 8 }}>Siguiente</span>}
                      </div>
                      <div className="appt-sub">
                        {cita.asunto}
                        {esAdmin && (cita.medicoTemporalNombre || cita.doctora) && (
                          <> · {cita.medicoTemporalNombre ?? `Dra. ${cita.doctora?.nombre}`}</>
                        )}
                      </div>
                    </div>
                    <span className={`pill ${PILL_ESTADO[cita.estado] ?? 'pill-gray'}`}>{cita.estado}</span>
                  </li>
                )
              })}
            </ul>
          )}

          <Link href="/agenda" className="card-footer-link">Ver agenda completa →</Link>
        </section>

        {/* ── Columna lateral: contexto y atajos ── */}
        <div className="dash-side">
          {esAdmin && pendientesAprobacion > 0 && (
            <Link href="/configuracion/usuarios?estado=pendiente" className="alert-link">
              <i className="ti ti-alert-circle" />
              <span>
                {pendientesAprobacion} solicitud{pendientesAprobacion > 1 ? 'es' : ''} de acceso pendiente{pendientesAprobacion > 1 ? 's' : ''}
              </span>
              <i className="ti ti-chevron-right" style={{ marginLeft: 'auto' }} />
            </Link>
          )}

          <div className="stat-grid">
            {stats.map(s => (
              <div key={s.label} className="card stat-tile">
                <div className="stat-tile-top">
                  <span>{s.label}</span>
                  <i className={`ti ${s.icon}`} style={{ color: s.color }} />
                </div>
                <div className="stat-tile-value">{s.value}</div>
              </div>
            ))}
          </div>

          <section className="card" style={{ padding: '6px 18px' }} aria-label="Acciones rápidas">
            {acciones.map((item, i) => (
              <Link key={item.href} href={item.href} className="quick-link" style={i === acciones.length - 1 ? { borderBottom: 'none' } : undefined}>
                <span className="quick-icon" style={{ background: item.bg }}>
                  <i className={`ti ${item.icon}`} style={{ color: item.color }} />
                </span>
                <span>
                  <span className="quick-label">{item.label}</span>
                  <span className="quick-sub">{item.sub}</span>
                </span>
                <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
