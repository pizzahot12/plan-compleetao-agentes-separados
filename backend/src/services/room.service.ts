import { supabaseAdmin } from '../lib/database.js'
import type { RoomDetails, RoomMessage, RoomSync, WSEvent } from '../types/index.js'
import { getMediaDetails } from './jellyfin.service.js'
import logger from '../utils/logger.js'

// In-memory room state (for real-time sync - not persisted)
interface RoomState {
  status: 'play' | 'pause'
  currentTime: number
  participants: Map<string, WebSocket>
  hostId: string
}

const rooms = new Map<string, RoomState>()

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function createRoom(
  hostId: string,
  mediaId: string,
  name: string,
  isPrivate: boolean
): Promise<{ roomId: string; code: string }> {
  const code = generateCode()

  const { data, error } = await supabaseAdmin
    .from('rooms')
    .insert({
      host_id: hostId,
      media_id: mediaId,
      name,
      code,
      is_private: isPrivate,
    })
    .select('id')
    .single()

  if (error || !data) {
    logger.error('Failed to create room:', error?.message)
    throw new Error('Error al crear sala')
  }

  // Initialize in-memory state
  rooms.set(data.id, {
    status: 'pause',
    currentTime: 0,
    participants: new Map(),
    hostId,
  })

  return { roomId: data.id, code }
}

export async function getRoomByCode(code: string): Promise<RoomDetails | null> {
  const { data: room, error } = await supabaseAdmin
    .from('rooms')
    .select(`
      id,
      code,
      media_id,
      host_id,
      name,
      is_private,
      created_at,
      profiles!rooms_host_id_fkey (id, name, avatar)
    `)
    .eq('code', code)
    .single()

  if (error || !room) return null

  // Get participants from room_participants table
  const { data: participants } = await supabaseAdmin
    .from('room_participants')
    .select('user_id, profiles (id, name, avatar)')
    .eq('room_id', room.id)

  const host = room.profiles as unknown as { id: string; name: string; avatar?: string }
  const state = rooms.get(room.id)
  const isOnline = (userId: string) => state ? state.participants.has(userId) : false

  return {
    roomId: room.id,
    code: room.code,
    mediaId: room.media_id,
    host: { id: host.id, name: host.name, avatar: host.avatar, isWatching: true, isOnline: isOnline(host.id) },
    participants: (participants || []).map((p) => {
      const profile = p.profiles as unknown as { id: string; name: string; avatar?: string }
      return {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        isWatching: true,
        isOnline: isOnline(profile.id),
      }
    }),
    createdAt: room.created_at,
  }
}

export async function getActiveRooms(userId: string): Promise<any[]> {
  const { data: rooms, error } = await supabaseAdmin
    .from('rooms')
    .select(`
      id,
      code,
      media_id,
      host_id,
      name,
      is_private,
      created_at,
      profiles!rooms_host_id_fkey(name, avatar),
      room_participants(user_id)
    `)
    .order('created_at', { ascending: false })

  if (error || !rooms) return []

  // Resolve media details using Jellyfin (which uses memory cache so it's very fast)
  const activeRooms = await Promise.all(
    rooms.map(async (room) => {
      let mediaTitle = room.name
      let mediaPoster = ''
      let mediaType = 'movie'

      try {
        const details = await getMediaDetails(room.media_id)
        if (details) {
          mediaTitle = details.title || room.name
          mediaPoster = details.poster || ''
          mediaType = details.type || 'movie'
        }
      } catch (e) {
        // Ignore
      }

      const host = room.profiles as unknown as { name: string; avatar?: string }
      const participants = (room.room_participants as unknown as any[]) || []

      // Determine visibility
      const isHost = room.host_id === userId
      const isParticipant = participants.some((p: any) => p.user_id === userId)

      // If private, only host and existing participants can see it
      if (room.is_private && !isHost && !isParticipant) return null

      return {
        id: room.id,
        code: room.code,
        name: room.name,
        mediaTitle,
        mediaPoster,
        mediaType,
        hostName: host?.name || 'Usuario',
        hostAvatar: host?.avatar || '',
        participantCount: participants.length || 1, // at least host
        isPrivate: room.is_private,
        createdAt: room.created_at,
        isHost
      }
    })
  )

  return activeRooms.filter(r => r !== null)
}

export async function addParticipant(roomId: string, userId: string, ws?: unknown): Promise<void> {
  await supabaseAdmin.from('room_participants').upsert({
    room_id: roomId,
    user_id: userId,
  })

  // If room is not in memory (e.g. server restarted), auto-initialize it from DB
  if (!rooms.has(roomId)) {
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('id, host_id')
      .eq('id', roomId)
      .single()

    if (room) {
      logger.info(`Re-initializing room ${roomId} in memory after server restart`)
      rooms.set(roomId, {
        status: 'pause',
        currentTime: 0,
        participants: new Map(),
        hostId: room.host_id,
      })
    } else {
      logger.warn(`Room ${roomId} not found in DB, cannot add participant`)
      return
    }
  }

  // Add to in-memory
  const state = rooms.get(roomId)
  if (state && ws) {
    state.participants.set(userId, ws as WebSocket)
  }
}

export function getRoomHostId(roomId: string): string | null {
  const state = rooms.get(roomId)
  return state ? state.hostId : null
}

export async function removeParticipant(roomId: string, userId: string): Promise<void> {
  await supabaseAdmin
    .from('room_participants')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId)

  const state = rooms.get(roomId)
  if (state) {
    state.participants.delete(userId)
  }
}

export function broadcastToRoom(roomId: string, event: WSEvent, excludeUserId?: string): void {
  const state = rooms.get(roomId)
  if (!state) return

  const message = JSON.stringify(event)

  state.participants.forEach((ws, odUserId) => {
    if (odUserId !== excludeUserId) {
      try {
        ws.send(message)
      } catch {
        logger.warn(`Failed to send message to user ${odUserId} in room ${roomId}`)
      }
    }
  })
}

export function updateRoomSync(roomId: string, status: 'play' | 'pause', currentTime: number): void {
  const state = rooms.get(roomId)
  if (state) {
    state.status = status
    state.currentTime = currentTime
  }
}

export function getRoomSync(roomId: string): RoomSync {
  const state = rooms.get(roomId)
  return {
    status: state?.status || 'pause',
    currentTime: state?.currentTime || 0,
  }
}

export async function addMessage(
  roomId: string,
  userId: string,
  text: string
): Promise<RoomMessage> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .single()

  const { data, error } = await supabaseAdmin
    .from('room_messages')
    .insert({
      room_id: roomId,
      user_id: userId,
      text,
    })
    .select('id, text, user_id, created_at')
    .single()

  if (error || !data) {
    throw new Error('Error al enviar mensaje')
  }

  const message: RoomMessage = {
    messageId: data.id,
    text: data.text,
    userId: data.user_id,
    userName: profile?.name || 'Anonimo',
    timestamp: data.created_at,
  }

  // Broadcast to room
  broadcastToRoom(roomId, { type: 'chat_message', ...message })

  return message
}

export async function deleteRoom(roomId: string, userId: string): Promise<void> {
  // Verify host
  const { data: room } = await supabaseAdmin
    .from('rooms')
    .select('host_id')
    .eq('id', roomId)
    .single()

  if (!room || room.host_id !== userId) {
    throw new Error('Solo el host puede eliminar la sala')
  }

  // Broadcast room closed
  broadcastToRoom(roomId, { type: 'room_closed', reason: 'host_closed' })

  // Clean up
  await supabaseAdmin.from('room_participants').delete().eq('room_id', roomId)
  await supabaseAdmin.from('room_messages').delete().eq('room_id', roomId)
  await supabaseAdmin.from('rooms').delete().eq('id', roomId)

  rooms.delete(roomId)
}

export async function kickUser(roomId: string, hostId: string, targetUserId: string): Promise<void> {
  // Verify host
  const { data: room } = await supabaseAdmin
    .from('rooms')
    .select('host_id')
    .eq('id', roomId)
    .single()

  if (!room || room.host_id !== hostId) {
    throw new Error('Solo el host puede expulsar usuarios')
  }

  // Notify kicked user
  const state = rooms.get(roomId)
  const targetWs = state?.participants.get(targetUserId)
  if (targetWs) {
    try {
      targetWs.send(JSON.stringify({ type: 'user_kicked', userId: targetUserId, reason: 'host_kicked' }))
      targetWs.close()
    } catch { /* ignore */ }
  }

  await removeParticipant(roomId, targetUserId)

  // Broadcast to others
  broadcastToRoom(roomId, { type: 'user_left', userId: targetUserId })
}

// Auto-cleanup worker for empty rooms older than 5 minutes
export async function cleanupEmptyRooms(): Promise<void> {
  try {
    const { data: activeRooms, error } = await supabaseAdmin
      .from('rooms')
      .select('id, created_at, room_participants(user_id)')

    if (error || !activeRooms) return

    const now = new Date()
    const fiveMinutes = 5 * 60 * 1000

    for (const room of activeRooms) {
      const parts = room.room_participants as unknown as any[]
      const count = parts ? parts.length : 0
      const createdAt = new Date(room.created_at)

      if (count === 0 && (now.getTime() - createdAt.getTime()) > fiveMinutes) {
        logger.info(`Cleaning up abandoned empty room: ${room.id}`)
        await supabaseAdmin.from('room_messages').delete().eq('room_id', room.id)
        await supabaseAdmin.from('rooms').delete().eq('id', room.id)
        rooms.delete(room.id)
      }
    }
  } catch (err) {
    logger.error('Error cleaning up rooms:', err)
  }
}
