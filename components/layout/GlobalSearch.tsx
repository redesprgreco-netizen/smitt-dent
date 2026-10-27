'use client'
// Buscador global de pacientes (Ctrl+K). Usa /api/expedientes?q=
// y respeta los permisos del API (las doctoras solo ven sus pacientes).
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Resultado {
  id: number
  folio: string
  nombre: string
  apellido: string
  telefono: string | null
}

export default function GlobalSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Resultado[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Atajo Ctrl/Cmd + K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Búsqueda con debounce
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setRes([]); setLoading(false); return }
    setLoading(true)
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/expedientes?q=${encodeURIComponent(term)}&pageSize=6`, { signal: ctrl.signal })
        const d = await r.json()
        if (d.ok) { setRes(d.data); setActive(0) }
      } catch { /* abortado o sin conexión */ }
      finally { if (!ctrl.signal.aborted) setLoading(false) }
    }, 250)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q])

  function go(r: Resultado) {
    setOpen(false)
    setQ('')
    setRes([])
    inputRef.current?.blur()
    router.push(`/expedientes/${r.id}`)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, res.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && res[active]) { e.preventDefault(); go(res[active]) }
  }

  const term = q.trim()
  const showPanel = open && term.length >= 2

  return (
    <div className="gs-wrap" ref={wrapRef}>
      <i className="ti ti-search gs-icon" />
      <input
        ref={inputRef}
        className="gs-input"
        placeholder="Buscar paciente…"
        aria-label="Buscar paciente por nombre, folio o teléfono"
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <kbd className="gs-kbd">Ctrl K</kbd>

      {showPanel && (
        <div className="gs-panel" role="listbox">
          {loading && res.length === 0 ? (
            <div className="gs-empty">Buscando…</div>
          ) : res.length === 0 ? (
            <div className="gs-empty">Sin resultados para “{term}”</div>
          ) : res.map((r, i) => (
            <button
              key={r.id}
              role="option"
              aria-selected={i === active}
              className={`gs-item${i === active ? ' active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r)}
            >
              <span className="gs-avatar">{r.nombre[0]}{r.apellido[0]}</span>
              <span className="gs-main">
                <span className="gs-name">{r.nombre} {r.apellido}</span>
                <span className="gs-meta">{r.folio}{r.telefono ? ` · ${r.telefono}` : ''}</span>
              </span>
              <i className="ti ti-chevron-right gs-go" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
