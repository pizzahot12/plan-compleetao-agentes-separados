import type { Context } from 'hono'
import * as roomService from '../services/room.service.js'
import { createRoomSchema, chatMessageSchema } from '../utils/validators.js'
import type { AppVariables, WSEvent } from '../types/index.js'
import logger from '../utils/logger.js'

export async function createRoom(c: Context<{ Variables: AppVariables }>) {
  const body = await c.req.json()
  const parsed = createRoomSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400)
  }

  const userId = c.get('userId')

  try {
    const room = await roomService.createRoom(
      userId,
      parsed.data.mediaId,
      parsed.data.name,
      parsed.data.isPrivate
    )
    return c.json(room, 201)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function getRoomByCode(c: Context) {
  const code = c.req.param('code')

  try {
    const room = await roomService.getRoomByCode(code)
    if (!room) {
      return c.json({ error: 'Sala no encontrada' }, 404)
    }
    return c.json(room)
  } catch (err) {
    return c.json({ error: 'Error al obtener sala' }, 500)
  }
}

export async function getActiveRooms(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  try {
    const rooms = await roomService.getActiveRooms(userId)
    return c.json(rooms)
  } catch (err) {
    logger.error('Error in getActiveRooms:', err)
    return c.json({ error: 'Error al obtener las salas activas' }, 500)
  }
}

export async function addMessage(c: Context<{ Variables: AppVariables }>) {
  const roomId = c.req.param('roomId')
  const body = await c.req.json()
  const parsed = chatMessageSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400)
  }

  const userId = c.get('userId')

  try {
    const message = await roomService.addMessage(roomId, userId, parsed.data.text)
    return c.json(message, 201)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function deleteRoom(c: Context<{ Variables: AppVariables }>) {
  const roomId = c.req.param('roomId')
  const userId = c.get('userId')

  try {
    await roomService.deleteRoom(roomId, userId)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 403)
  }
}

export async function kickUser(c: Context<{ Variables: AppVariables }>) {
  const roomId = c.req.param('roomId')
  const targetUserId = c.req.param('userId')
  const hostId = c.get('userId')

  try {
    await roomService.kickUser(roomId, hostId, targetUserId)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 403)
  }
}

export async function getSync(c: Context) {
  const roomId = c.req.param('roomId')

  const sync = roomService.getRoomSync(roomId)
  return c.json(sync)
}

export async function inviteUser(c: Context<{ Variables: AppVariables }>) {
  const roomId = c.req.param('roomId')
  const targetUserId = c.req.param('userId')
  const hostId = c.get('userId')

  try {
    await roomService.inviteUser(roomId, hostId, targetUserId)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 403)
  }
}
export async function updatePrivacy(c: Context<{ Variables: AppVariables }>) {
  const roomId = c.req.param('roomId')
  const userId = c.get('userId')
  const body = await c.req.json()
  const isPrivate = body.isPrivate

  try {
    await roomService.updatePrivacy(roomId, userId, isPrivate)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 403)
  }
}

// --- WebSocket handlers ---

export async function handleUserJoined(roomId: string, userId: string, ws?: unknown): Promise<void> {
  logger.info(`User ${userId} joined room ${roomId}`)
  await roomService.addParticipant(roomId, userId, ws)
  roomService.broadcastToRoom(roomId, { type: 'user_joined', userId }, userId)
}

export async function handleUserLeft(roomId: string, userId: string): Promise<void> {
  logger.info(`User ${userId} left room ${roomId}`)
  await roomService.removeParticipant(roomId, userId)
  roomService.broadcastToRoom(roomId, { type: 'user_left', userId })
}

export async function handleWebSocketMessage(
  roomId: string,
  userId: string,
  data: WSEvent
): Promise<void> {
  const hostId = roomService.getRoomHostId(roomId)
  const isHost = hostId === userId

  switch (data.type) {
    case 'play':
      if (!isHost) {
        logger.warn(`User ${userId} tried to play but is not host in room ${roomId}`)
        return
      }
      roomService.updateRoomSync(roomId, 'play', data.currentTime as number)
      roomService.broadcastToRoom(roomId, {
        type: 'play',
        currentTime: data.currentTime,
        playedBy: userId,
      }, userId)
      break

    case 'pause':
      // Anyone can pause
      roomService.updateRoomSync(roomId, 'pause', data.currentTime as number)
      roomService.broadcastToRoom(roomId, {
        type: 'pause',
        currentTime: data.currentTime,
        pausedBy: userId,
      }, userId)
      break

    case 'seek':
      if (!isHost) {
        logger.warn(`User ${userId} tried to seek but is not host in room ${roomId}`)
        return
      }
      roomService.updateRoomSync(
        roomId,
        roomService.getRoomSync(roomId).status,
        data.currentTime as number
      )
      roomService.broadcastToRoom(roomId, {
        type: 'seek',
        currentTime: data.currentTime,
        seekBy: userId,
      }, userId)
      break

    case 'chat_message':
      await roomService.addMessage(roomId, userId, data.text as string)
      break

    default:
      logger.warn(`Unknown WS event type: ${data.type}`)
  }
}
