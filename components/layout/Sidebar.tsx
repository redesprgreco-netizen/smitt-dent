'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  rol: string
}

const NAV_ITEMS = [
  { href: '/dashboard',    icon: 'ti-layout-dashboard', label: 'Panel Principal', section: 'PRINCIPAL' },
  { href: '/agenda',       icon: 'ti-calendar',         label: 'Agenda',          section: 'CLÍNICA' },
  { href: '/expedientes',  icon: 'ti-folder-open',      label: 'Expedientes',     section: null },
  { href: '/facturacion',  icon: 'ti-cash',             label: 'Facturación',     section: null },
  { href: '/inventario',   icon: 'ti-package',          label: 'Inventario',      section: null },
  { href: '/reportes',     icon: 'ti-chart-bar',        label: 'Reportes',        section: 'ADMINISTRACIÓN', adminOnly: true },
  { href: '/configuracion',icon: 'ti-settings',         label: 'Configuración',   section: null, adminOnly: true },
]

export default function Sidebar({ rol }: SidebarProps) {
  const pathname = usePathname()
  let lastSection = ''

  return (
    <nav className="layout-sidebar">
      <div style={{ flex: 1 }}>
        {NAV_ITEMS.filter(item => !item.adminOnly || rol === 'admin').map(item => {
          const showSection = item.section && item.section !== lastSection
          if (showSection) lastSection = item.section!
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <div key={item.href}>
              {showSection && (
                <div className="nav-section-label">{item.section}</div>
              )}
              <Link href={item.href} className={`nav-item${isActive ? ' active' : ''}`}>
                <i className={`ti ${item.icon}`} />
                {item.label}
              </Link>
            </div>
          )
        })}
      </div>

      <div style={{ paddingBottom: 16 }}>
        {rol === 'admin' && (
          <Link
            href="/configuracion/usuarios"
            className={`nav-item${pathname.startsWith('/configuracion/usuarios') ? ' active' : ''}`}
          >
            <i className="ti ti-users" />
            Usuarios
          </Link>
        )}
      </div>
    </nav>
  )
}
