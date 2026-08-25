'use client'
// components/odontograma/Odontograma2D.tsx
// Vista 2D grande, anatómicamente segmentada: formas distintas por tipo de diente,
// numeración arriba/abajo, marcadores de superficie/nota, y estado clínico por color.
import type { PiezaData } from './odontograma-data'
import { ESTADO_COLOR, ESTADO_ICON, ESTADO_LABEL, FDI_A_ALTERNA, claseDiente } from './odontograma-data'

interface Props {
  piezas: Record<number, PiezaData>
  selected: number | null
  onSelect: (num: number | null) => void
  numeracion: 'fdi' | 'alterna'
  cuadrantes: { supDer: number[]; supIzq: number[]; infIzq: number[]; infDer: number[] }
}

export default function Odontograma2D({ piezas, selected, onSelect, numeracion, cuadrantes }: Props) {
  function Tooth({ num, arcada }: { num: number; arcada: 'superior' | 'inferior' }) {
    const pieza = piezas[num]
    const estado = pieza?.estado ?? 'sin_tratamiento'
    const colors = ESTADO_COLOR[estado]
    const isSelected = selected === num
    const clase = claseDiente(num)
    const esAusente = estado === 'ausente'
    const tieneSuperficies = pieza?.superficies && Object.keys(pieza.superficies).length > 0
    const tieneNota = !!pieza?.notas
    const infantil = num >= 51
    // Piezas grandes: la vista 2D ahora es notablemente más grande y legible
    const w = clase === 'molar' ? (infantil ? 40 : 46) : (infantil ? 30 : 36)
    const h = infantil ? 36 : 44

    const shapeStyle: React.CSSProperties = {
      width: w, height: h,
      background: esAusente ? 'transparent' : colors.bg,
      border: `2px ${esAusente ? 'dashed' : 'solid'} ${isSelected ? 'var(--blue-accent)' : colors.border}`,
      boxShadow: isSelected ? '0 0 0 3px rgba(34,114,212,0.22)' : '0 1px 2px rgba(20,30,50,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
      opacity: esAusente ? 0.5 : 1,
    }
    if (clase === 'canino') {
      shapeStyle.clipPath = 'polygon(15% 0%, 85% 0%, 100% 68%, 50% 100%, 0% 68%)'
    } else if (clase === 'incisivo') {
      shapeStyle.borderRadius = '3px 3px 10px 10px'
    } else if (clase === 'premolar') {
      shapeStyle.borderRadius = '10px'
    } else {
      shapeStyle.borderRadius = '9px'
    }
    if (arcada === 'inferior') shapeStyle.transform = 'scaleY(-1)'

    const icon = ESTADO_ICON[estado]

    return (
      <div
        onClick={() => onSelect(isSelected ? null : num)}
        onMouseEnter={e => { if (!isSelected) (e.currentTarget.firstChild as HTMLElement)?.style.setProperty('filter', 'brightness(0.97)') }}
        onMouseLeave={e => { (e.currentTarget.firstChild as HTMLElement)?.style.removeProperty('filter') }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
        title={`Pieza ${num} — ${ESTADO_LABEL[estado]}`}
      >
        {arcada === 'superior' && (
          <span style={{ fontSize: 11, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--blue-accent)' : 'var(--text-muted)' }}>
            {numeracion === 'alterna' ? FDI_A_ALTERNA[num] : num}
          </span>
        )}
        <div style={shapeStyle}>
          {!esAusente && (clase === 'molar' || clase === 'premolar') && (
            <div style={{
              position: 'absolute', display: 'grid',
              gridTemplateColumns: clase === 'molar' ? 'repeat(2, 1fr)' : '1fr',
              gap: 3, transform: arcada === 'inferior' ? 'scaleY(-1)' : undefined,
            }}>
              {Array.from({ length: clase === 'molar' ? 4 : 1 }).map((_, i) => (
                <div key={i} style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: colors.border, opacity: 0.5 }} />
              ))}
            </div>
          )}
          {icon && !esAusente && (
            <i className={`ti ${icon}`} style={{
              fontSize: clase === 'molar' ? 17 : 14, color: colors.fg, position: 'relative', zIndex: 1,
              transform: arcada === 'inferior' ? 'scaleY(-1)' : undefined,
            }} />
          )}
          {(tieneSuperficies || tieneNota) && (
            <div style={{
              position: 'absolute', top: -4, right: -4, width: 9, height: 9, borderRadius: '50%',
              background: tieneSuperficies ? '#d8303f' : 'var(--blue-accent)',
              border: '1.5px solid #fff', transform: arcada === 'inferior' ? 'scaleY(-1)' : undefined,
            }} />
          )}
        </div>
        {arcada === 'inferior' && (
          <span style={{ fontSize: 11, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--blue-accent)' : 'var(--text-muted)' }}>
            {numeracion === 'alterna' ? FDI_A_ALTERNA[num] : num}
          </span>
        )}
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
        Arcada superior
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 22, paddingBottom: 18, borderBottom: '1px dashed var(--border)', flexWrap: 'wrap' }}>
        {cuadrantes.supDer.map(n => <Tooth key={n} num={n} arcada="superior" />)}
        <div style={{ width: 1.5, background: 'var(--border)', margin: '0 6px' }} />
        {cuadrantes.supIzq.map(n => <Tooth key={n} num={n} arcada="superior" />)}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {cuadrantes.infDer.slice().reverse().map(n => <Tooth key={n} num={n} arcada="inferior" />)}
        <div style={{ width: 1.5, background: 'var(--border)', margin: '0 6px' }} />
        {cuadrantes.infIzq.slice().reverse().map(n => <Tooth key={n} num={n} arcada="inferior" />)}
      </div>
      <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'center' }}>
        Arcada inferior
      </p>
    </div>
  )
}
