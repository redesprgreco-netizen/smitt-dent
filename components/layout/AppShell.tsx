'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import { SparkleProvider } from './SparkleEffect'

interface AppShellProps {
  nombre: string
  apellido: string
  rol: string
  children: React.ReactNode
}

export default function AppShell({ nombre, apellido, rol, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Cierra el menú móvil automáticamente al navegar
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <SparkleProvider>
      <Topbar nombre={nombre} apellido={apellido} rol={rol} onMenuClick={() => setSidebarOpen(o => !o)} />
      <Sidebar rol={rol} open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}
      <main className="layout-main">
        <div key={pathname} className="page-fade-in">
          {children}
        </div>
      </main>
    </SparkleProvider>
  )
}
