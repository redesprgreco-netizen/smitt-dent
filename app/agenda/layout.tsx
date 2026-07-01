// app/dashboard/layout.tsx (shared by all protected pages)
import { redirect } from 'next/navigation'
import { getSessionFromCookie } from '@/lib/auth'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookie()
  if (!session) redirect('/login')

  return (
    <>
      <Topbar nombre={session.nombre} apellido={session.apellido} rol={session.rol} />
      <Sidebar rol={session.rol} />
      <main className="layout-main">
        {children}
      </main>
    </>
  )
}
