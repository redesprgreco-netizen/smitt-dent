'use client'

const DORADO = '#F5A623'

export default function BannerAvisos({ texto }) {
  if (!texto) return null

  return (
    <div style={{
      background: DORADO,
      color: '#000',
      fontWeight: 700,
      textAlign: 'center',
      padding: '10px 16px',
      fontSize: 14,
    }}>
      📣 {texto}
    </div>
  )
}
