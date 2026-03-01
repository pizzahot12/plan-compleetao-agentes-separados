import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import corsMiddleware from './middleware/cors.js'
import errorHandler from './middleware/errorHandler.js'
import authMiddleware from './middleware/auth.middleware.js'
import authRoutes from './routes/auth.routes.js'
import mediaRoutes from './routes/media.routes.js'
import streamRoutes from './routes/stream.routes.js'
import roomsRoutes from './routes/rooms.routes.js'
import friendsRoutes from './routes/friends.routes.js'
import notificationsRoutes from './routes/notifications.routes.js'
import watchHistoryRoutes from './routes/watch-history.routes.js'
import { roomsController } from './routes/rooms.routes.js'
import type { AppVariables, WSEvent } from './types/index.js'
import { verifyToken } from './lib/jwt.js'
import logger from './utils/logger.js'

const app = new Hono<{ Variables: AppVariables }>()

// WebSocket setup
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

// Global middleware
app.use('*', corsMiddleware)
app.use('*', errorHandler)

// Health check (public)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

// Public routes
app.route('/api/auth', authRoutes)

// Protected routes (require JWT)
// Temporarily disabled for testing:
// app.use('/api/media/*', authMiddleware)
// app.use('/api/stream/*', authMiddleware)
app.use('/api/rooms/*', authMiddleware)
app.use('/api/friends/*', authMiddleware)
app.use('/api/notifications/*', authMiddleware)
app.use('/api/history/*', authMiddleware)

app.route('/api/media', mediaRoutes)
app.route('/api/stream', streamRoutes)
app.route('/api/rooms', roomsRoutes)
app.route('/api/friends', friendsRoutes)
app.route('/api/notifications', notificationsRoutes)
app.route('/api/history', watchHistoryRoutes)

// WebSocket endpoint for rooms
app.get(
  '/ws/rooms/:roomId',
  upgradeWebSocket((c) => {
    const roomId = c.req.param('roomId')
    // Get token from query param for WebSocket auth
    const token = c.req.query('token')

    let userId = 'anonymous'

    if (token) {
      try {
        const payload = verifyToken(token)
        userId = payload.userId
      } catch {
        logger.warn('Invalid WebSocket token')
      }
    }

    return {
      onOpen: async (_evt, ws) => {
        logger.info(`WebSocket opened: room=${roomId} user=${userId}`)
        await roomsController.handleUserJoined(roomId, userId, ws)
        ws.send(
          JSON.stringify({
            type: 'connection_established',
            roomId,
          })
        )
      },
      onMessage: async (evt, _ws) => {
        try {
          const data = JSON.parse(evt.data as string) as WSEvent
          await roomsController.handleWebSocketMessage(roomId, userId, data)
        } catch (err) {
          logger.error('WebSocket message error:', (err as Error).message)
        }
      },
      onClose: async () => {
        logger.info(`WebSocket closed: room=${roomId} user=${userId}`)
        await roomsController.handleUserLeft(roomId, userId)
      },
    }
  })
)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Ruta no encontrada' }, 404)
})

// Start server
const port = parseInt(process.env.PORT || '3000', 10)

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info(`PlexParty Backend running on http://localhost:${info.port}`)
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
  }
)

// Inject WebSocket support into the server
injectWebSocket(server)

export default app
