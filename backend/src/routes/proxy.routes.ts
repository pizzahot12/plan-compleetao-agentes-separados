import { Hono } from 'hono'
import type { AppVariables } from '../types/index.js'
import logger from '../utils/logger.js'

const proxyRoutes = new Hono<{ Variables: AppVariables }>()

// Proxy any request starting with /api/proxy/jellyfin to the remote Jellyfin server
proxyRoutes.all('/*', async (c) => {
  const JELLYFIN_URL = process.env.JELLYFIN_URL || 'https://jellyfin.watchtogether.nl'
  const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY || 'fab44659f9b74192924b80d2a3b0e8a2'

  // Construct target URL
  let targetPath = c.req.path.replace('/api/proxy/jellyfin', '')
  if (!targetPath.startsWith('/')) {
    targetPath = '/' + targetPath
  }

  const queryParams = new URLSearchParams(c.req.query() as Record<string, string>)

  // Remove the JWT token so it doesn't go to Jellyfin
  queryParams.delete('token')

  // Inject the API key securely from the server
  queryParams.set('api_key', JELLYFIN_API_KEY)

  const targetUrl = `${JELLYFIN_URL}${targetPath}?${queryParams.toString()}`

  try {
    const headers = new Headers()
    const range = c.req.header('range')
    if (range) headers.set('range', range)

    const safeHeaders = ['accept', 'user-agent']
    for (const h of safeHeaders) {
      const val = c.req.header(h)
      if (val) headers.set(h, val)
    }

    const isVideoSegment = targetPath.includes('.ts') || targetPath.includes('.m3u8')
    const controller = new AbortController()
    const timeoutMs = isVideoSegment ? 180_000 : 30_000
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timer)

    const responseHeaders = new Headers()
    response.headers.forEach((val, key) => {
      responseHeaders.set(key, val)
    })

    responseHeaders.delete('access-control-allow-origin')
    responseHeaders.delete('access-control-allow-methods')

    responseHeaders.delete('content-encoding')
    responseHeaders.delete('content-length')

    return new Response(response.body as any, {
      status: response.status,
      headers: responseHeaders
    })
  } catch (err) {
    logger.error('Proxy routing failed to Jellyfin', err)
    return c.json({ error: 'Proxy failed' }, 500)
  }
})

export default proxyRoutes
