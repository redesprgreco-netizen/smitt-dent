import Image from 'next/image'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f6f5] px-4 py-8">
      <section className="w-full max-w-[360px] rounded-[40px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex justify-center">
          <Image
            src="/dentista.jpg"
            alt="Logo de Smitt-Dent"
            width={520}
            height={320}
            className="h-auto w-full max-w-[200px] object-contain"
            priority
          />
        </div>

        <div className="mt-5 text-center">
          <h1 className="text-2xl font-semibold text-slate-950">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Bienvenida al sistema de gestión clínica
          </p>
        </div>

        <div className="mt-5">
          <LoginForm />
        </div>
      </section>
    </main>
  )
}
