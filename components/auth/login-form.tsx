'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Estados para validación local
  const [emailError, setEmailError] = useState('')
  const [passError, setPassError] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setEmailError('')
    setPassError(false)

    const formData = new FormData(event.currentTarget)
    const correo = String(formData.get('correo') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    // Validación local antes de enviar
    let hasError = false

    if (!correo) {
      setEmailError('Completa los campos obligatorios.')
      hasError = true
    } else if (!EMAIL_REGEX.test(correo)) {
      setEmailError('Correo electrónico no válido.')
      hasError = true
    }

    if (!password) {
      setPassError(true)
      hasError = true
    }

    if (hasError) return

    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ correo, password }),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(data.error ?? 'Error al iniciar sesión.')
        return
      }

      // Forzar navegación completa para garantizar que la cookie de sesión sea aplicada
      window.location.href = '/dashboard'
    } catch {
      setError('Error de red. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      {/* Campo Correo */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1" htmlFor="correo">
          Correo Electrónico
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          placeholder="admin@clinica.com"
          className={`rounded-2xl border ${emailError ? 'border-rose-400 ring-4 ring-rose-500/10' : 'border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10'} bg-white px-5 py-4 text-sm outline-none transition text-gray-900`}
        />
        {emailError && (
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight pl-1">
            {emailError}
          </p>
        )}
      </div>

      {/* Campo Contraseña */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1" htmlFor="password">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Tu contraseña"
            className={`w-full rounded-2xl border ${passError ? 'border-rose-400 ring-4 ring-rose-500/10' : 'border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10'} bg-white px-5 py-4 pr-12 text-sm outline-none transition text-gray-900`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-teal-600 transition-colors"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.076m1.902-1.903A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>
        {passError && (
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight pl-1">
            Completa los campos obligatorios.
          </p>
        )}
      </div>

      {/* Error General */}
      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-5 py-4 text-xs font-bold text-rose-600 flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-[1.5rem] bg-gradient-to-r from-teal-600 to-cyan-500 py-4 text-sm font-bold text-white shadow-xl shadow-teal-600/20 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
      >
        {loading ? 'Verificando...' : 'Ingresar al Panel'}
      </button>

      <p className="text-center text-xs text-gray-400 mt-2">
        ¿Eres nueva doctora?{' '}
        <Link href="/register" className="font-bold text-teal-600 hover:text-teal-700">
          Solicitar acceso
        </Link>
      </p>
    </form>
  )
}
