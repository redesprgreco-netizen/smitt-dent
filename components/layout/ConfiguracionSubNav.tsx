'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ConfiguracionSubNav() {
  const pathname = usePathname()
  return (
    <div className="tabs-bar">
      {[
        { href: '/configuracion/usuarios', label: 'Usuarios', icon: 'ti-users' },
        { href: '/configuracion/bitacora', label: 'Bitácora', icon: 'ti-history' },
      ].map(t => (
        <Link key={t.href} href={t.href} style={{ textDecoration: 'none' }}>
          <button className={`tab-btn${pathname.startsWith(t.href) ? ' active' : ''}`}>
            <i className={`ti ${t.icon}`} style={{ marginRight: 6 }} />{t.label}
          </button>
        </Link>
      ))}
    </div>
  )
}
