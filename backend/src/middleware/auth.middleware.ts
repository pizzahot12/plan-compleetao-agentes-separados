import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../lib/jwt.js'
import type { AppVariables } from '../types/index.js'

const authMiddleware = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const queryToken = c.req.query('token')

  let token = ''
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else if (queryToken) {
    token = queryToken
  }

  if (!token) {
    return c.json({ error: 'Token no proporcionado' }, 401)
  }

  try {
    const payload = verifyToken(token)
    c.set('userId', payload.userId)
    c.set('userEmail', payload.email)
    await next()
  } catch {
    return c.json({ error: 'Token invalido o expirado' }, 401)
  }
})

export default authMiddleware
