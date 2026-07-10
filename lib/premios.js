// Configuración del ciclo de promociones de La Gallina Rebelde
// La compra número 1 es la primera después de reiniciar el ciclo.
// Cuando el cliente llega a META_ESTRELLAS y canjea, el contador vuelve a 0.

export const META_ESTRELLAS = 6

export const PREMIOS = {
  1: null,
  2: { texto: '10% de descuento', tipo: 'descuento', valor: 10 },
  3: null,
  4: { texto: '25% de descuento en tu compra total', tipo: 'descuento', valor: 25 },
  5: null,
  6: { texto: '¡Papas gratis!', tipo: 'producto', valor: 'papas' },
}

export function premioParaCompra(numeroCompra) {
  return PREMIOS[numeroCompra] || null
}
