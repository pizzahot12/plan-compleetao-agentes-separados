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
    // Bypass auth for nested HLS streams since Native Safari/iOS cannot append Authorization headers or tokens to nested m3u8 requests automatically
    const path = c.req.path
    if (path.startsWith('/api/proxy/jellyfin/Videos/') &&
      (path.endsWith('.m3u8') || path.endsWith('.ts') || path.includes('/hls/') || path.includes('/stream'))) {
      return next()
    }
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
