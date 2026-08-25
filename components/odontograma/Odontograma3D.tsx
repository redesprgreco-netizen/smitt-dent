'use client'
// components/odontograma/Odontograma3D.tsx
// Vista 3D real de la arcada dental, renderizada con three.js (react-three-fiber).
// Cada pieza es una malla procedural (corona + raíz) coloreada según su estado clínico,
// ubicada anatómicamente a lo largo de una curva de arco dental. Se rota libremente
// con el mouse (OrbitControls) para una inspección en 360°.
import { useMemo, useRef, useState } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, RoundedBox, Text, Billboard, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import type { PiezaData } from './odontograma-data'
import { ESTADO_COLOR, FDI_A_ALTERNA, claseDiente, SUPERFICIE_COLOR, type Clase } from './odontograma-data'

interface Props {
  piezas: Record<number, PiezaData>
  selected: number | null
  onSelect: (num: number | null) => void
  numeracion: 'fdi' | 'alterna'
  cuadrantes: { supDer: number[]; supIzq: number[]; infIzq: number[]; infDer: number[] }
}

const COLOR_ESMALTE_SANO = '#f5f0e4'
const COLOR_RAIZ = '#efe6d3'
const COLOR_ENCIA = '#e0949c'

// Punto sobre la curva del arco dental (herradura). t: 0 (extremo derecho) → 1 (extremo izquierdo).
function puntoArco(t: number, radioX: number, radioZ: number, anguloMax: number): [number, number] {
  const theta = -anguloMax + t * 2 * anguloMax
  const x = radioX * Math.sin(theta)
  const z = radioZ * (1 - Math.cos(theta))
  return [x, z]
}

const DIM_POR_CLASE: Record<Clase, { w: number; h: number; d: number }> = {
  incisivo: { w: 0.34, h: 0.62, d: 0.24 },
  canino:   { w: 0.32, h: 0.72, d: 0.26 },
  premolar: { w: 0.42, h: 0.52, d: 0.4 },
  molar:    { w: 0.56, h: 0.48, d: 0.54 },
}

function Corona({ clase, color, seleccionada }: { clase: Clase; color: string; seleccionada: boolean }) {
  const { w, h, d } = DIM_POR_CLASE[clase]
  const matProps = {
    color,
    roughness: 0.32,
    metalness: 0.04,
    emissive: seleccionada ? new THREE.Color('#2272d4') : new THREE.Color('#000000'),
    emissiveIntensity: seleccionada ? 0.4 : 0,
  }
  if (clase === 'canino') {
    return (
      <mesh position={[0, -h / 2, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[w / 2, h, 8]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    )
  }
  const cusps = clase === 'molar'
    ? [[-w / 4, -h / 2 + 0.04, -d / 4], [w / 4, -h / 2 + 0.04, -d / 4], [-w / 4, -h / 2 + 0.04, d / 4], [w / 4, -h / 2 + 0.04, d / 4]]
    : clase === 'premolar'
    ? [[-0.08, -h / 2 + 0.03, 0], [0.08, -h / 2 + 0.03, 0]]
    : []
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={clase === 'incisivo' ? 0.05 : 0.08} smoothness={2} castShadow>
        <meshStandardMaterial {...matProps} />
      </RoundedBox>
      {cusps.map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      ))}
    </group>
  )
}

function Raiz({ clase }: { clase: Clase }) {
  const { w, h } = DIM_POR_CLASE[clase]
  const rootH = h * 0.95
  const multiRaiz = clase === 'molar' || clase === 'premolar'
  if (!multiRaiz) {
    return (
      <mesh position={[0, h / 2 + rootH / 2, 0]}>
        <coneGeometry args={[w * 0.26, rootH, 8]} />
        <meshStandardMaterial color={COLOR_RAIZ} roughness={0.6} />
      </mesh>
    )
  }
  const n = clase === 'molar' ? 2 : 2
  const offsets = n === 2 ? [-w * 0.22, w * 0.22] : [0]
  return (
    <group>
      {offsets.map((ox, i) => (
        <mesh key={i} position={[ox, h / 2 + rootH / 2, 0]}>
          <coneGeometry args={[w * 0.17, rootH, 7]} />
          <meshStandardMaterial color={COLOR_RAIZ} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function MarcadoresSuperficie({ pieza, clase }: { pieza?: PiezaData; clase: Clase }) {
  const sup = pieza?.superficies
  if (!sup) return null
  const { w, h, d } = DIM_POR_CLASE[clase]
  const entradas = Object.entries(sup).filter(([, v]) => v && v !== 'sano')
  if (entradas.length === 0) return null
  const posiciones: Record<string, [number, number, number]> = {
    vestibular: [0, 0, d / 2 + 0.03],
    palatino: [0, 0, -d / 2 - 0.03],
    mesial: [-w / 2 - 0.03, 0, 0],
    distal: [w / 2 + 0.03, 0, 0],
    oclusal: [0, -h / 2 - 0.02, 0],
  }
  return (
    <>
      {entradas.map(([cara, estadoSup]) => {
        const pos = posiciones[cara]
        if (!pos) return null
        const color = SUPERFICIE_COLOR[estadoSup as string]?.hex ?? '#d8303f'
        return (
          <mesh key={cara} position={pos}>
            <sphereGeometry args={[0.055, 10, 10]} />
            <meshStandardMaterial color={color} roughness={0.3} emissive={color} emissiveIntensity={0.25} />
          </mesh>
        )
      })}
    </>
  )
}

function Diente({
  num, x, z, theta, archY, arcada, pieza, seleccionada, onClick,
  numeracion,
}: {
  num: number; x: number; z: number; theta: number; archY: number
  arcada: 'superior' | 'inferior'
  pieza?: PiezaData
  seleccionada: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
  numeracion: 'fdi' | 'alterna'
}) {
  const clase = claseDiente(num)
  const estado = pieza?.estado ?? 'sin_tratamiento'
  const esAusente = estado === 'ausente'
  const color = estado === 'sin_tratamiento' ? COLOR_ESMALTE_SANO : ESTADO_COLOR[estado].border
  const { h } = DIM_POR_CLASE[clase]
  const etiqueta = numeracion === 'alterna' ? (FDI_A_ALTERNA[num] ?? String(num)) : String(num)

  // theta orienta el diente para que su cara vestibular mire hacia afuera del arco.
  // La arcada inferior se voltea 180° para que la corona apunte hacia arriba.
  const rotZ = arcada === 'inferior' ? Math.PI : 0

  return (
    <group position={[x, archY, z]} rotation={[0, theta, rotZ]}>
      <group
        scale={seleccionada ? 1.12 : 1}
        onClick={onClick}
        onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        {!esAusente && <Corona clase={clase} color={color} seleccionada={seleccionada} />}
        {!esAusente && <Raiz clase={clase} />}
        {!esAusente && <MarcadoresSuperficie pieza={pieza} clase={clase} />}
        {esAusente && (
          <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.12, 0.22, 16]} />
            <meshStandardMaterial color="#8a97ad" transparent opacity={0.35} side={THREE.DoubleSide} />
          </mesh>
        )}
        {/* Malla invisible más grande para facilitar el clic */}
        <mesh visible={false}>
          <boxGeometry args={[0.7, h + 0.6, 0.7]} />
        </mesh>
      </group>
      <Billboard position={[0, (arcada === 'superior' ? 1 : -1) * (h / 2 + 0.55), 0]}>
        <Text fontSize={0.16} color={seleccionada ? '#2272d4' : '#7a8aa5'} anchorX="center" anchorY="middle">
          {etiqueta}
        </Text>
      </Billboard>
    </group>
  )
}

function EncíaTubo({ puntos, y }: { puntos: [number, number][]; y: number }) {
  const geometry = useMemo(() => {
    const pts = puntos.map(([x, z]) => new THREE.Vector3(x, y, z))
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4)
    return new THREE.TubeGeometry(curve, 80, 0.16, 10, false)
  }, [puntos, y])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={COLOR_ENCIA} roughness={0.55} />
    </mesh>
  )
}

function Escena({ piezas, selected, onSelect, numeracion, cuadrantes }: Props) {
  const radioX = 2.6
  const radioZ = 1.9
  const anguloMax = 1.68
  const archGap = 0.85

  // Orden secuencial alrededor del arco: derecha → frente → izquierda
  const ordenSup = [...cuadrantes.supDer, ...cuadrantes.supIzq]
  const ordenInfArco = [...cuadrantes.infDer, ...cuadrantes.infIzq]

  function posiciones(orden: number[]) {
    return orden.map((num, i) => {
      const t = orden.length > 1 ? i / (orden.length - 1) : 0.5
      const theta = -anguloMax + t * 2 * anguloMax
      const [x, z] = puntoArco(t, radioX, radioZ, anguloMax)
      return { num, x, z, theta }
    })
  }

  const supPos = useMemo(() => posiciones(ordenSup), [ordenSup])
  const infPos = useMemo(() => posiciones(ordenInfArco), [ordenInfArco])

  const puntosArcoSup = useMemo(() => {
    const pts: [number, number][] = []
    for (let i = 0; i <= 40; i++) pts.push(puntoArco(i / 40, radioX, radioZ, anguloMax))
    return pts
  }, [])

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 8, 5]} intensity={0.85} />
      <directionalLight position={[-5, 3, -4]} intensity={0.3} />
      <group onPointerMissed={() => onSelect(null)}>
        <EncíaTubo puntos={puntosArcoSup} y={archGap} />
        <EncíaTubo puntos={puntosArcoSup} y={-archGap} />
        {supPos.map(({ num, x, z, theta }) => (
          <Diente
            key={num} num={num} x={x} z={z} theta={theta} archY={archGap} arcada="superior"
            pieza={piezas[num]} seleccionada={selected === num} numeracion={numeracion}
            onClick={e => { e.stopPropagation(); onSelect(selected === num ? null : num) }}
          />
        ))}
        {infPos.map(({ num, x, z, theta }) => (
          <Diente
            key={num} num={num} x={x} z={z} theta={theta} archY={-archGap} arcada="inferior"
            pieza={piezas[num]} seleccionada={selected === num} numeracion={numeracion}
            onClick={e => { e.stopPropagation(); onSelect(selected === num ? null : num) }}
          />
        ))}
      </group>
      <ContactShadows position={[0, -archGap - 0.9, 0]} opacity={0.28} scale={9} blur={2.4} far={2} />
    </>
  )
}

export default function Odontograma3D({ piezas, selected, onSelect, numeracion, cuadrantes }: Props) {
  const [autoRotate, setAutoRotate] = useState(false)
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null)

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        height: 560, borderRadius: 12, overflow: 'hidden',
        background: 'linear-gradient(180deg, #eef3fa 0%, #dde6f2 100%)',
        cursor: 'grab',
      }}>
        <Canvas camera={{ position: [0, 1.8, 6], fov: 38 }} dpr={[1, 2]}>
          <Escena piezas={piezas} selected={selected} onSelect={onSelect} numeracion={numeracion} cuadrantes={cuadrantes} />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            minDistance={3}
            maxDistance={10}
            minPolarAngle={Math.PI * 0.12}
            maxPolarAngle={Math.PI * 0.88}
            target={[0, 0, 0.4]}
            autoRotate={autoRotate}
            autoRotateSpeed={1.1}
          />
        </Canvas>
      </div>

      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={() => setAutoRotate(v => !v)}
          className="btn btn-sm"
          style={{
            background: autoRotate ? 'var(--blue-light)' : '#fff',
            border: `1px solid ${autoRotate ? 'var(--blue-accent)' : 'var(--border)'}`,
            color: autoRotate ? 'var(--blue-accent)' : 'var(--text-main)',
          }}
        >
          <i className="ti ti-rotate-3d" style={{ marginRight: 5 }} />
          {autoRotate ? 'Detener giro' : 'Girar automático'}
        </button>
        <button
          type="button"
          onClick={() => controlsRef.current?.reset()}
          className="btn btn-secondary btn-sm"
          title="Restablecer vista"
        >
          <i className="ti ti-refresh" />
        </button>
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
        Arrastra con el mouse para rotar en 360° · rueda del mouse para acercar/alejar · clic en una pieza para seleccionarla
      </p>
    </div>
  )
}
