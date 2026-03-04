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

    // Copy safe headers from client request
    const safeHeaders = ['accept', 'user-agent']
    for (const h of safeHeaders) {
      const val = c.req.header(h)
      if (val) headers.set(h, val)
    }

    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers,
    })

    const responseHeaders = new Headers()
    response.headers.forEach((val, key) => {
      responseHeaders.set(key, val)
    })

    // Remove strict CORS from Jellyfin if present so our backend can manage it natively via the global cors handler
    responseHeaders.delete('access-control-allow-origin')
    responseHeaders.delete('access-control-allow-methods')

    // Remove compression headers because node-fetch decompresses automatically, which would cause the browser to fail decoding
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
