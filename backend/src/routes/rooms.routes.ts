import { Hono } from 'hono'
import { createNodeWebSocket } from '@hono/node-ws'
import * as roomsController from '../controllers/roomsController.js'
import type { AppVariables, WSEvent } from '../types/index.js'

const routes = new Hono<{ Variables: AppVariables }>()

// REST endpoints
routes.post('/', roomsController.createRoom)
routes.get('/', roomsController.getActiveRooms)
routes.get('/:code', roomsController.getRoomByCode)
routes.post('/:roomId/messages', roomsController.addMessage)
routes.delete('/:roomId', roomsController.deleteRoom)
routes.post('/:roomId/kick/:userId', roomsController.kickUser)
routes.post('/:roomId/invite/:userId', roomsController.inviteUser)
routes.patch('/:roomId/privacy', roomsController.updatePrivacy)
routes.get('/:roomId/sync', roomsController.getSync)

export default routes

// WebSocket setup is done in index.ts since it needs the server instance
export { roomsController }
