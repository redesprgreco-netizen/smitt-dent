import { redirect } from 'next/navigation'
import { getSessionFromCookie } from '@/lib/auth'
import AppShell from '@/components/layout/AppShell'

export default async function ReportesLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookie()
  if (!session) redirect('/login')
  if (session.rol !== 'admin') redirect('/dashboard')

  return (
    <AppShell nombre={session.nombre} apellido={session.apellido} rol={session.rol}>
      {children}
    </AppShell>
  )
}
