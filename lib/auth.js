// Revisa si la petición trae la cookie de sesión válida (puesta por /api/admin-login).
// Se usa dentro de las API routes sensibles para que nadie pueda llamarlas
// directo (sin pasar por /scan o /admin) sin la contraseña.
export function tieneSesionValida(req) {
  const sesion = req.cookies.get('admin_session')
  return Boolean(sesion && sesion.value === 'ok')
}

export function respuestaNoAutorizado() {
  return Response.json({ error: 'No autorizado' }, { status: 401 })
}
