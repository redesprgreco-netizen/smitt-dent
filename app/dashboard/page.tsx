// app/dashboard/page.tsx
import { getSessionFromCookie } from '@/lib/auth'
import prisma from '@/lib/prisma'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSessionFromCookie()

  // Stats rápidas del día de hoy
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)

  const [citasHoy, expedientesActivos, pagosMes, pendientesAprobacion] = await Promise.all([
    prisma.cita.count({
      where: {
        fecha: { gte: hoy, lt: manana },
        estado: { not: 'cancelada' },
        ...(session?.rol !== 'admin' && { doctoraId: session?.sub }),
      },
    }),
    prisma.expediente.count({
      where: {
        estado: 'activo',
        ...(session?.rol !== 'admin' && { doctoraId: session?.sub }),
      },
    }),
    prisma.pago.aggregate({
      where: {
        estado: 'activo',
        createdAt: {
          gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
          lt: manana,
        },
      },
      _sum: { monto: true },
    }),
    session?.rol === 'admin'
      ? prisma.usuario.count({ where: { estado: 'pendiente' } })
      : Promise.resolve(0),
  ])

  // Próximas citas del día
  const citasProximas = await prisma.cita.findMany({
    where: {
      fecha: { gte: hoy, lt: manana },
      estado: { not: 'cancelada' },
      ...(session?.rol !== 'admin' && { doctoraId: session?.sub }),
    },
    include: { doctora: { select: { id: true, nombre: true, apellido: true, colorAgenda: true } } },
    orderBy: { hora: 'asc' },
    take: 6,
  })

  const modules = [
    { href: '/agenda',       icon: 'ti-calendar',    label: 'Agenda',        sub: 'Citas del día',     color: 'ic-blue'  },
    { href: '/expedientes',  icon: 'ti-folder-open', label: 'Expedientes',   sub: 'Fichas clínicas',   color: 'ic-teal'  },
    { href: '/facturacion',  icon: 'ti-cash',        label: 'Facturación',   sub: 'Cobros y recibos',  color: 'ic-green' },
    { href: '/inventario',   icon: 'ti-package',     label: 'Inventario',    sub: 'Stock de insumos',  color: 'ic-amber' },
    ...(session?.rol === 'admin' ? [
      { href: '/reportes',      icon: 'ti-chart-bar', label: 'Reportes',      sub: 'Estadísticas',   color: 'ic-purple' },
      { href: '/configuracion', icon: 'ti-settings',  label: 'Configuración', sub: 'Sistema',        color: 'ic-navy'   },
    ] : []),
  ]

  const formatHora = (h: Date | null) => {
    if (!h) return '--:--'
    const d = new Date(h)
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const formatMonto = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora', fontSize: 22, fontWeight: 700 }}>Panel Principal</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {session?.rol === 'admin' && pendientesAprobacion > 0 && (
          <Link href="/configuracion/usuarios?estado=pendiente">
            <div style={{
              background: '#fff4e0', border: '1px solid #f5d876', borderRadius: 10,
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="ti ti-alert-circle" style={{ color: '#c87d00', fontSize: 18 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#c87d00' }}>
                {pendientesAprobacion} solicitud{pendientesAprobacion > 1 ? 'es' : ''} pendiente{pendientesAprobacion > 1 ? 's' : ''}
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Citas hoy',         value: citasHoy,                          icon: 'ti-calendar-event', color: '#2272d4' },
          { label: 'Expedientes activos', value: expedientesActivos,               icon: 'ti-folder-open',    color: '#00918a' },
          { label: 'Cobrado este mes',   value: formatMonto(Number(pagosMes._sum.monto ?? 0)), icon: 'ti-cash', color: '#1a9e5c', isMonto: true },
          ...(session?.rol === 'admin' ? [{ label: 'Solicitudes pendientes', value: pendientesAprobacion, icon: 'ti-user-check', color: '#c87d00' }] : [
            { label: 'Citas esta semana', value: citasHoy, icon: 'ti-calendar-week', color: '#6c3fcf' },
          ]),
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.label}</span>
              <i className={`ti ${stat.icon}`} style={{ fontSize: 18, color: stat.color }} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--text-main)' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Módulos */}
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 14 }}>
        Módulos
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 36 }}>
        {modules.map(m => (
          <Link key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{
              padding: '22px 16px 18px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 10, cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(13,43,85,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
            >
              <div className={`${m.color}`} style={{ width: 52, height: 52, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${m.icon}`} style={{ fontSize: 26 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'center', color: 'var(--text-main)' }}>{m.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{m.sub}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Citas de hoy */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-calendar-event" style={{ fontSize: 16, color: 'var(--text-muted)' }} />
            Citas de hoy
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{citasProximas.length} citas</span>
          </div>
          {citasProximas.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              No hay citas programadas para hoy
            </p>
          ) : citasProximas.map(cita => (
            <div key={cita.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: cita.doctora.colorAgenda ?? 'var(--blue-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, color: '#fff',
              }}>
                {cita.nombrePaciente[0]}{cita.apellidoPaciente[0]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{cita.nombrePaciente} {cita.apellidoPaciente}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatHora(cita.hora)} · {cita.asunto}</div>
              </div>
              <span className={`pill ${cita.estado === 'confirmada' ? 'pill-green' : cita.estado === 'completada' ? 'pill-blue' : 'pill-amber'}`} style={{ marginLeft: 'auto' }}>
                {cita.estado}
              </span>
            </div>
          ))}
          <Link href="/agenda" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--blue-accent)', fontWeight: 500 }}>
            Ver agenda completa →
          </Link>
        </div>

        {/* Accesos rápidos */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-bolt" style={{ fontSize: 16, color: 'var(--text-muted)' }} />
            Acciones rápidas
          </div>
          {[
            { label: 'Nueva cita', sub: 'Agendar paciente', icon: 'ti-calendar-plus', href: '/agenda?nueva=1',      color: '#2272d4', bg: '#e8f1fb' },
            { label: 'Nuevo expediente', sub: 'Registrar paciente', icon: 'ti-folder-plus', href: '/expedientes?nuevo=1', color: '#00918a', bg: '#e0f7f6' },
            { label: 'Registrar pago', sub: 'Cobro rápido', icon: 'ti-cash', href: '/facturacion?nuevo=1',       color: '#1a9e5c', bg: '#e8f8ee' },
            ...(session?.rol === 'admin' ? [{ label: 'Ver reportes', sub: 'Estadísticas del mes', icon: 'ti-chart-bar', href: '/reportes', color: '#6c3fcf', bg: '#f0ecff' }] : []),
          ].map((item, i) => (
            <Link key={i} href={item.href} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: 18, color: item.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.sub}</div>
                </div>
                <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 16 }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
