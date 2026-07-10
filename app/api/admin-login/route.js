// POST /api/admin-login -> valida la contraseña y crea una cookie de sesión
export async function POST(req) {
  const { password } = await req.json()

  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const response = Response.json({ ok: true })
  response.headers.set(
    'Set-Cookie',
    `admin_session=ok; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 12}` // 12 horas
  )
  return response
}
