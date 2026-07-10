// Genera un código corto tipo "A3F9K2" (fácil de escanear e imprimir).
// Se evita el 0/O y 1/I para no confundir al leer manualmente si hace falta.
const CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generarCodigoCorto(longitud = 6) {
  let codigo = ''
  for (let i = 0; i < longitud; i++) {
    codigo += CARACTERES[Math.floor(Math.random() * CARACTERES.length)]
  }
  return codigo
}
