'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

interface DiaDisponible {
  fecha: string
  horarios: string[]
}

function mostrarFecha(fecha: string) {
  const [year, month, day] = fecha.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

export default function SolicitarCitaPage() {
  const [dias, setDias] = useState<DiaDisponible[]>([])
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [form, setForm] = useState({ nombrePaciente: '', apellidoPaciente: '', telefono: '', correo: '' })
  const fechaRef = useRef('')

  const cargarDisponibilidad = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const res = await fetch('/api/solicitar-cita', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'No se pudo consultar la disponibilidad.')
        return
      }
      setDias(data.data)
      const selectedDate = data.data.some((dia: DiaDisponible) => dia.fecha === fechaRef.current)
        ? fechaRef.current
        : data.data[0]?.fecha ?? ''
      fechaRef.current = selectedDate
      setFecha(selectedDate)
      setHora(current => data.data.find((dia: DiaDisponible) => dia.fecha === selectedDate)?.horarios.includes(current)
        ? current
        : '')
    } catch {
      setError('No se pudo consultar la disponibilidad. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarDisponibilidad() }, [cargarDisponibilidad])

  const diaSeleccionado = dias.find(dia => dia.fecha === fecha)

  async function enviarSolicitud(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!fecha || !hora) {
      setError('Selecciona el día y la hora que prefieres.')
      return
    }

    setEnviando(true)
    setError('')
    try {
      const res = await fetch('/api/solicitar-cita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fecha, hora, sitioWeb: '' }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'No se pudo enviar la solicitud.')
        if (res.status === 409) await cargarDisponibilidad()
        return
      }
      setMensaje(data.data.message)
      setHora('')
      setForm({ nombrePaciente: '', apellidoPaciente: '', telefono: '', correo: '' })
      await cargarDisponibilidad()
    } catch {
      setError('No se pudo enviar la solicitud. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f3f6f5', padding: '32px 16px 56px' }}>
      <section style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link href="/login" style={{ color: '#1d6fd8', fontSize: 13, textDecoration: 'none' }}>
          <i className="ti ti-arrow-left" /> Volver
        </Link>
        <div className="card" style={{ marginTop: 16, padding: 'clamp(20px, 5vw, 36px)' }}>
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: 'var(--blue-accent)', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Smitt-Dent</p>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>Solicita una cita</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              Elige un horario disponible y déjanos tus datos. La clínica se pondrá en contacto contigo para confirmar.
              Tu solicitud no queda confirmada hasta que recibas respuesta.
            </p>
          </div>

          <div style={{ padding: 14, borderRadius: 9, background: '#f0f6ff', border: '1px solid #bcd6f7', marginBottom: 24 }}>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              <strong>Horario de atención:</strong> lunes a viernes de 9:00 a 18:00; sábado de 9:00 a 14:00.
              Las citas duran hasta 60 minutos y dejamos 5 minutos entre ellas.
            </p>
          </div>

          {mensaje && (
            <div role="status" style={{ padding: 14, borderRadius: 8, background: '#e8f7ef', color: '#176a3a', marginBottom: 20 }}>
              <i className="ti ti-circle-check" /> {mensaje}
            </div>
          )}
          {error && (
            <div role="alert" style={{ padding: 12, borderRadius: 8, background: '#fdeae8', color: '#a93226', marginBottom: 20, fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>1. Elige un día</h2>
            {cargando ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Buscando horarios disponibles...</p>
            ) : dias.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay horarios disponibles por el momento. Comunícate con la clínica.</p>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {dias.map(dia => (
                  <button
                    key={dia.fecha}
                    type="button"
                    aria-pressed={fecha === dia.fecha}
                    onClick={() => { fechaRef.current = dia.fecha; setFecha(dia.fecha); setHora(''); setMensaje('') }}
                    className={fecha === dia.fecha ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {mostrarFecha(dia.fecha)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {diaSeleccionado && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>2. Elige una hora</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {diaSeleccionado.horarios.map(horario => (
                  <button
                    key={horario}
                    type="button"
                    aria-pressed={hora === horario}
                    onClick={() => { setHora(horario); setMensaje('') }}
                    className={hora === horario ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  >
                    {horario}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={enviarSolicitud}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>3. Tus datos de contacto</h2>
            <div
              aria-hidden="true"
              style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
            >
              <label htmlFor="sitio-web">Deja vacío este campo</label>
              <input id="sitio-web" name="sitioWeb" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
              <label className="form-label">
                Nombre
                <input className="form-input" required minLength={2} maxLength={80} autoComplete="given-name" value={form.nombrePaciente}
                  onChange={event => setForm(current => ({ ...current, nombrePaciente: event.target.value }))} />
              </label>
              <label className="form-label">
                Apellido
                <input className="form-input" required minLength={2} maxLength={80} autoComplete="family-name" value={form.apellidoPaciente}
                  onChange={event => setForm(current => ({ ...current, apellidoPaciente: event.target.value }))} />
              </label>
              <label className="form-label">
                Teléfono
                <input className="form-input" type="tel" required maxLength={20} autoComplete="tel" placeholder="Con lada"
                  value={form.telefono} onChange={event => setForm(current => ({ ...current, telefono: event.target.value }))} />
              </label>
              <label className="form-label">
                Correo electrónico (opcional)
                <input className="form-input" type="email" maxLength={120} autoComplete="email" value={form.correo}
                  onChange={event => setForm(current => ({ ...current, correo: event.target.value }))} />
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={enviando || cargando || !fecha || !hora} style={{ marginTop: 18 }}>
              <i className="ti ti-calendar-plus" /> {enviando ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </form>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
          No solicitamos información médica en este formulario. Tus datos solo se usarán para contactarte sobre esta solicitud.
        </p>
      </section>
    </main>
  )
}
