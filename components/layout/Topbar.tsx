'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSparkle } from './SparkleEffect'

interface TopbarProps {
  nombre: string
  apellido: string
  rol: string
  onMenuClick?: () => void
}

export default function Topbar({ nombre, apellido, rol, onMenuClick }: TopbarProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const sparkle = useSparkle()
  const initials = `${nombre[0]}${apellido[0]}`.toUpperCase()

  async function handleLogout() {
    await fetch('/api/auth/me', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <header className="layout-topbar" onClickCapture={(e) => sparkle(e.clientX, e.clientY)}>
      {/* Botón menú (solo móvil) */}
      <button
        onClick={onMenuClick}
        aria-label="Abrir menú"
        className="topbar-menu-btn"
        style={{
          display: 'none', background: 'none', border: 'none', cursor: 'pointer',
          color: '#fff', fontSize: 22, padding: 4, alignItems: 'center',
        }}
      >
        <i className="ti ti-menu-2" />
      </button>

      {/* Logo */}
      <a href="/dashboard" className="topbar-logo-link" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div className="topbar-logo-badge" style={{
          width: 36, height: 36, background: 'var(--teal)', borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-tooth topbar-logo-icon" style={{ fontSize: 20, color: '#fff' }} />
        </div>
        <span style={{ fontFamily: 'Sora', fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
          Smitt<span style={{ color: 'var(--teal)' }}>Dent</span>
        </span>
      </a>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
        <i className="ti ti-bell topbar-bell" style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }} />

        {/* Avatar + menu */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setMenuOpen(o => !o)}
            className="topbar-avatar"
            style={{
              width: 34, height: 34, borderRadius: '50%', background: 'var(--blue-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {initials}
          </div>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setMenuOpen(false)} />
              <div className="topbar-dropdown" style={{
                position: 'absolute', top: 42, right: 0, zIndex: 300,
                background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                border: '1px solid var(--border)', padding: '8px 0', minWidth: 200,
              }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{nombre} {apellido}</div>
                  <div style={{
                    fontSize: 11, marginTop: 2, display: 'inline-block',
                    background: rol === 'admin' ? '#e8f1fb' : '#e0f7f6',
                    color: rol === 'admin' ? '#2272d4' : '#00918a',
                    padding: '2px 8px', borderRadius: 20, fontWeight: 500,
                  }}>
                    {rol === 'admin' ? 'Administradora' : rol === 'visitante' ? 'Visitante' : 'Doctora'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    padding: '10px 16px', fontSize: 13.5, cursor: 'pointer', color: '#c0392b',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <i className="ti ti-logout" style={{ fontSize: 16 }} />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
