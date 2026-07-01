import { redirect } from 'next/navigation'
import { getSessionFromCookie } from '@/lib/auth'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'

export default async function ReportesLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookie()
  if (!session) redirect('/login')
  if (session.rol !== 'admin') redirect('/dashboard')

  return (
    <>
      <Topbar nombre={session.nombre} apellido={session.apellido} rol={session.rol} />
      <Sidebar rol={session.rol} />
      <main className="layout-main">{children}</main>
    </>
  )
}
