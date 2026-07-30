// Shared shell (Topbar + Sidebar responsive) for all protected pages
import { redirect } from 'next/navigation'
import { getSessionFromCookie } from '@/lib/auth'
import AppShell from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookie()
  if (!session) redirect('/login')

  return (
    <AppShell nombre={session.nombre} apellido={session.apellido} rol={session.rol}>
      {children}
    </AppShell>
  )
}
