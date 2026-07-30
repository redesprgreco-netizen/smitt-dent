import { redirect } from 'next/navigation'
import { getSessionFromCookie } from '@/lib/auth'
import AppShell from '@/components/layout/AppShell'
import ConfiguracionSubNav from '@/components/layout/ConfiguracionSubNav'

export default async function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookie()
  if (!session) redirect('/login')
  if (session.rol !== 'admin') redirect('/dashboard')

  return (
    <AppShell nombre={session.nombre} apellido={session.apellido} rol={session.rol}>
      <h1 style={{ fontFamily: 'Sora', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Configuración</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>Usuarios y sistema</p>
      <ConfiguracionSubNav />
      {children}
    </AppShell>
  )
}
