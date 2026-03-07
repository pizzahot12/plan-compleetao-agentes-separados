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
  isPrivate: boolean,
  hostEmail?: string
): Promise<{ roomId: string; code: string }> {
  // Ensure the user has a profile to prevent foreign key constraint errors (500)
  const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('id', hostId).single()
  if (!profile) {
    try {
      await supabaseAdmin.from('profiles').insert({
        id: hostId,
        name: hostEmail?.split('@')[0] || 'User',
        email: hostEmail || ''
      })
      logger.info(`Auto-created profile for user ${hostId} before creating room`)
    } catch (e) {
      logger.error('Failed to auto-create profile:', e)
    }
  }

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

export async function updatePrivacy(roomId: string, userId: string, isPrivate: boolean): Promise<void> {
  const { data: room } = await supabaseAdmin.from('rooms').select('host_id').eq('id', roomId).single()
  if (!room || room.host_id !== userId) throw new Error('Unauthorized')

  await supabaseAdmin.from('rooms').update({ is_private: isPrivate }).eq('id', roomId)
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
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .single()

  if (profileErr || !profile) {
    try {
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        name: 'Guest ' + userId.substring(0, 4),
        email: `${userId}@guest.local`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      });
    } catch {
      // Ignorar error de creación de perfil invitado
    }
  }

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

  // Broadcast to room (including sender, because the frontend removed optimistic updates)
  broadcastToRoom(roomId, { type: 'chat_message', ...message })

  return message
}

export async function deleteRoom(roomId: string, userId: string): Promise<void> {
  // Verify host
  const { data: room, error: fetchErr } = await supabaseAdmin
    .from('rooms')
    .select('host_id')
    .eq('id', roomId)
    .single()

  if (fetchErr || !room) {
    console.error('[deleteRoom] Room not found:', roomId, fetchErr?.message)
    throw new Error('Sala no encontrada')
  }

  if (room.host_id !== userId) {
    throw new Error('Solo el host puede eliminar la sala')
  }

  // Broadcast room closed (via old WS — harmless if nobody is connected)
  broadcastToRoom(roomId, { type: 'room_closed', reason: 'host_closed' })

  // Clean up in correct order (children first, then parent)
  const { error: e1 } = await supabaseAdmin.from('room_messages').delete().eq('room_id', roomId)
  if (e1) console.error('[deleteRoom] Error deleting messages:', e1.message)

  const { error: e2 } = await supabaseAdmin.from('room_participants').delete().eq('room_id', roomId)
  if (e2) console.error('[deleteRoom] Error deleting participants:', e2.message)

  const { error: e3 } = await supabaseAdmin.from('rooms').delete().eq('id', roomId)
  if (e3) {
    console.error('[deleteRoom] Error deleting room:', e3.message)
    throw new Error('Error al eliminar la sala de la base de datos')
  }

  rooms.delete(roomId)
  console.log('[deleteRoom] Room deleted successfully:', roomId)
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

export async function inviteUser(roomId: string, hostId: string, targetUserId: string): Promise<void> {
  const { data: room, error } = await supabaseAdmin
    .from('rooms')
    .select('code, name, host_id, media_id, profiles!rooms_host_id_fkey(name, avatar)')
    .eq('id', roomId)
    .single()

  if (error || !room) {
    logger.error('[inviteUser] Room not found:', roomId, error?.message)
    throw new Error('Sala no encontrada')
  }

  // Allow host OR any authenticated user in the room to invite
  // (previously only host could invite, which was too restrictive)
  logger.info(`[inviteUser] User ${hostId} inviting ${targetUserId} to room ${roomId} (host: ${room.host_id})`)

  // Get inviter's profile (may be host or any participant)
  let inviterName = 'Alguien'
  let inviterAvatar: string | undefined
  if (hostId === room.host_id) {
    const hostProfile = room.profiles as unknown as { name: string; avatar?: string }
    inviterName = hostProfile?.name || 'Host'
    inviterAvatar = hostProfile?.avatar
  } else {
    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('name, avatar')
      .eq('id', hostId)
      .single()
    if (inviterProfile) {
      inviterName = inviterProfile.name
      inviterAvatar = inviterProfile.avatar ?? undefined
    }
  }

  let mediaTitle = room.name
  try {
    const details = await getMediaDetails(room.media_id)
    if (details && details.title) {
      mediaTitle = details.title
    }
  } catch (e) {
    //
  }

  const { error: notifError } = await supabaseAdmin.from('notifications').insert({
    user_id: targetUserId,
    type: 'invite',
    data: {
      roomCode: room.code,
      title: `Invitación a sala`,
      message: `${inviterName} te ha invitado a ver ${mediaTitle}`,
      userAvatar: inviterAvatar,
    },
  })

  if (notifError) {
    logger.error('Failed to send invite notification:', notifError.message)
    throw new Error('Error al enviar invitacion')
  }
}

// Auto-cleanup worker: only delete rooms with no participants that are older than 2 hours.
// 2-hour threshold gives enough time for Render.com cold starts, mobile reconnects,
// and page refreshes without losing the room due to a brief WS disconnect.
export async function cleanupEmptyRooms(): Promise<void> {
  try {
    const { data: activeRooms, error } = await supabaseAdmin
      .from('rooms')
      .select('id, created_at, room_participants(user_id)')

    if (error || !activeRooms) return

    const now = new Date()
    const twoHours = 2 * 60 * 60 * 1000

    for (const room of activeRooms) {
      const parts = room.room_participants as unknown as any[]
      const count = parts ? parts.length : 0
      const createdAt = new Date(room.created_at)

      if (count === 0 && (now.getTime() - createdAt.getTime()) > twoHours) {
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
