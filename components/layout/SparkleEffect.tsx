'use client'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

interface Sparkle {
  id: number
  x: number
  y: number
  icon: string
}

const SparkleContext = createContext<(x: number, y: number) => void>(() => {})

export function useSparkle() {
  return useContext(SparkleContext)
}

// Alterna entre un diente y una sonrisa para que el efecto se sienta vivo
const ICONS = ['ti-tooth', 'ti-mood-smile', 'ti-tooth']

let counter = 0

export function SparkleProvider({ children }: { children: React.ReactNode }) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([])
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const trigger = useCallback((x: number, y: number) => {
    const id = ++counter
    const icon = ICONS[id % ICONS.length]
    setSparkles(prev => [...prev, { id, x, y, icon }])
    timers.current[id] = setTimeout(() => {
      setSparkles(prev => prev.filter(s => s.id !== id))
      delete timers.current[id]
    }, 900)
  }, [])

  return (
    <SparkleContext.Provider value={trigger}>
      {children}
      <div aria-hidden="true" className="sparkle-layer">
        {sparkles.map(s => (
          <span key={s.id} className="tooth-sparkle" style={{ left: s.x, top: s.y }}>
            <i className={`ti ${s.icon} tooth-sparkle-icon`} />
            <span className="sparkle-dot sparkle-dot-1">✦</span>
            <span className="sparkle-dot sparkle-dot-2">✧</span>
            <span className="sparkle-dot sparkle-dot-3">✦</span>
            <span className="sparkle-dot sparkle-dot-4">✧</span>
          </span>
        ))}
      </div>
    </SparkleContext.Provider>
  )
}
