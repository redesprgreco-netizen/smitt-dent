// hooks/useSession.ts
'use client'
import { useState, useEffect } from 'react'

export interface SessionData {
  id: number
  nombre: string
  apellido: string
  correo: string
  rol: 'admin' | 'doctora' | 'visitante'
  colorAgenda: string | null
}

export function useSession() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.ok) setSession(d.data) })
      .finally(() => setLoading(false))
  }, [])

  return { session, loading }
}
