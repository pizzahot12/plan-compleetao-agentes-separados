import supabase, { supabaseAdmin } from '../lib/database.js'
import type { RoomDetails, RoomMessage, RoomSync, WSEvent } from '../types/index.js'
import logger from '../utils/logger.js'

// In-memory room state (for real-time sync - not persisted)
interface RoomState {
  status: 'play' | 'pause'
  currentTime: number
  participants: Map<string, WebSocket>
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
  })

  return { roomId: data.id, code }
}

export async function getRoomByCode(code: string): Promise<RoomDetails | null> {
  const { data: room, error } = await supabase
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
  const { data: participants } = await supabase
    .from('room_participants')
    .select('user_id, profiles (id, name, avatar)')
    .eq('room_id', room.id)

  const host = room.profiles as unknown as { id: string; name: string; avatar?: string }

  return {
    roomId: room.id,
    code: room.code,
    mediaId: room.media_id,
    host: { id: host.id, name: host.name, avatar: host.avatar, isWatching: true },
    participants: (participants || []).map((p) => {
      const profile = p.profiles as unknown as { id: string; name: string; avatar?: string }
      return {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        isWatching: true,
      }
    }),
    createdAt: room.created_at,
  }
}

export async function addParticipant(roomId: string, userId: string, ws?: unknown): Promise<void> {
  await supabaseAdmin.from('room_participants').upsert({
    room_id: roomId,
    user_id: userId,
  })

  // Add to in-memory
  const state = rooms.get(roomId)
  if (state && ws) {
    state.participants.set(userId, ws as WebSocket)
  }
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
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .single()

  const { data, error } = await supabase
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
  broadcastToRoom(roomId, { type: 'message', ...message })

  return message
}

export async function deleteRoom(roomId: string, userId: string): Promise<void> {
  // Verify host
  const { data: room } = await supabase
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
  const { data: room } = await supabase
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
