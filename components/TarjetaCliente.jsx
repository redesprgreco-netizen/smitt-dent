'use client'

const DORADO = '#F5A623'
const ROJO = '#C81D25'

export default function TarjetaCliente({ cliente, onSalir }) {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 24, textAlign: 'center' }}>
      <img src="/logo-circular.png" alt="La Gallina Rebelde" style={{ width: 100, height: 100, borderRadius: '50%', marginTop: 20 }} />
      <h1 style={{ fontSize: 22, marginTop: 16, color: DORADO }}>¡Hola, {cliente.nombre || 'cliente'}!</h1>
      <p style={{ marginTop: 8, color: '#bbb' }}>Muestra este código en cada compra para sumar estrellas.</p>

      <div style={{
        marginTop: 24, padding: 20, background: 'white', borderRadius: 12,
        display: 'inline-block',
      }}>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(cliente.codigo)}`}
          alt="Tu código QR"
          width={220}
          height={220}
        />
      </div>

      <p style={{ marginTop: 14, fontSize: 28, letterSpacing: 4, fontWeight: 700, color: DORADO }}>
        {cliente.codigo}
      </p>

      <p style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
        Muestra el QR o dicta tu código en la tienda
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '20px 0' }}>
        {Array.from({ length: cliente.meta_estrellas }).map((_, i) => (
          <span key={i} style={{ fontSize: 28, color: i < cliente.estrellas ? DORADO : '#333' }}>★</span>
        ))}
      </div>

      <p style={{ color: '#ccc' }}>Compra {cliente.estrellas} de {cliente.meta_estrellas}</p>

      {cliente.estrellas >= cliente.meta_estrellas && (
        <div style={{ marginTop: 14, padding: 14, background: ROJO, borderRadius: 8, fontWeight: 700 }}>
          🎉 ¡Ya completaste tu ciclo! Pide tu premio en la tienda.
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 13, color: '#666' }}>
        (Próximamente: botón para agregar esta tarjeta a Apple/Google Wallet)
      </p>

      {onSalir && (
        <button
          onClick={onSalir}
          style={{
            marginTop: 16, padding: '10px 16px', borderRadius: 8, border: '1px solid #444',
            background: 'transparent', color: '#888', fontSize: 13, cursor: 'pointer',
          }}
        >
          No soy yo / usar otro código
        </button>
      )}

      <a
        href="/scan"
        style={{
          display: 'block', marginTop: 20, textAlign: 'center', padding: 12,
          borderRadius: 8, border: `1px solid #444`, color: '#888',
          fontSize: 13, textDecoration: 'none',
        }}
      >
        Acceso empleados →
      </a>
    </div>
  )
}
