import { supabaseAdmin } from '../lib/database.js'
import type { Friend } from '../types/index.js'
import type { FriendRow } from '../types/database.js'
import logger from '../utils/logger.js'

export async function getFriends(userId: string): Promise<Friend[]> {
  const { data, error } = await supabaseAdmin
    .from('friends')
    .select(`
      friend_id,
      status,
      profiles!friends_friend_id_fkey (id, name, avatar)
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted')

  if (error) {
    logger.error('Failed to get friends:', error.message)
    throw new Error('Error al obtener amigos')
  }

  const friendIds = (data || []).map((f) => f.friend_id)
  const activeRoomsMap: Record<string, { code: string; name: string }> = {}

  if (friendIds.length > 0) {
    const { data: participants } = await supabaseAdmin
      .from('room_participants')
      .select('user_id, rooms(code, name)')
      .in('user_id', friendIds)

    if (participants) {
      for (const p of participants) {
        if (p.rooms) {
          activeRoomsMap[p.user_id] = Array.isArray(p.rooms) ? p.rooms[0] : p.rooms
        }
      }
    }
  }

  return (data || []).map((f) => {
    const profile = f.profiles as unknown as { id: string; name: string; avatar?: string }
    const room = activeRoomsMap[profile.id]

    return {
      id: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      status: room ? 'online' : 'offline', // They are online if they are in a room
      isOnline: !!room,
      isWatching: !!room,
      roomCode: room?.code,
      currentMedia: room?.name,
    } as Friend
  })
}

export async function getPendingRequests(userId: string): Promise<Friend[]> {
  const { data, error } = await supabaseAdmin
    .from('friends')
    .select(`
      user_id,
      status,
      created_at,
      profiles!friends_user_id_fkey (id, name, avatar)
    `)
    .eq('friend_id', userId)
    .eq('status', 'pending')

  if (error) {
    logger.error('Failed to get pending requests:', error.message)
    throw new Error('Error al obtener solicitudes pendientes')
  }

  return (data || []).map((f) => {
    const profile = f.profiles as unknown as { id: string; name: string; avatar?: string }
    return {
      id: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      status: 'offline' as const,
    }
  })
}

export async function sendFriendRequest(userId: string, friendId: string): Promise<void> {
  if (userId === friendId) {
    throw new Error('No puedes agregarte a ti mismo')
  }

  // Check if user exists
  const { data: friendProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', friendId)
    .single()

  if (!friendProfile) {
    throw new Error('Usuario no encontrado')
  }

  // Check if already friends or pending
  const { data: existing } = await supabaseAdmin
    .from('friends')
    .select('id, status')
    .eq('user_id', userId)
    .eq('friend_id', friendId)
    .single()

  if (existing) {
    if (existing.status === 'accepted') {
      throw new Error('Ya son amigos')
    }
    if (existing.status === 'pending') {
      throw new Error('Solicitud ya enviada')
    }
    if (existing.status === 'blocked') {
      throw new Error('Usuario bloqueado')
    }
  }

  // Check if the other user already sent us a request
  const { data: reverseRequest } = await supabaseAdmin
    .from('friends')
    .select('id, status')
    .eq('user_id', friendId)
    .eq('friend_id', userId)
    .single()

  if (reverseRequest && reverseRequest.status === 'pending') {
    // Auto-accept: both users want to be friends
    await supabaseAdmin
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', reverseRequest.id)

    await supabaseAdmin.from('friends').insert({
      user_id: userId,
      friend_id: friendId,
      status: 'accepted',
    })

    logger.info(`Auto-accepted friendship: ${userId} <-> ${friendId}`)
    return
  }

  // Send pending request
  const { error } = await supabaseAdmin.from('friends').insert({
    user_id: userId,
    friend_id: friendId,
    status: 'pending',
  })

  if (error) {
    logger.error('Failed to send friend request:', error.message)
    throw new Error('Error al enviar solicitud de amistad')
  }

  // Create notification for the target user
  await supabaseAdmin.from('notifications').insert({
    user_id: friendId,
    type: 'friend_request',
    data: { fromUserId: userId },
  })

  logger.info(`Friend request sent: ${userId} -> ${friendId}`)
}

export async function acceptFriendRequest(userId: string, fromUserId: string): Promise<void> {
  // Find the pending request
  const { data: request, error: findError } = await supabaseAdmin
    .from('friends')
    .select('id')
    .eq('user_id', fromUserId)
    .eq('friend_id', userId)
    .eq('status', 'pending')
    .single()

  if (findError || !request) {
    throw new Error('Solicitud no encontrada')
  }

  // Accept: update existing + create reverse
  await supabaseAdmin
    .from('friends')
    .update({ status: 'accepted' })
    .eq('id', request.id)

  await supabaseAdmin.from('friends').insert({
    user_id: userId,
    friend_id: fromUserId,
    status: 'accepted',
  })

  // Notify the requester
  await supabaseAdmin.from('notifications').insert({
    user_id: fromUserId,
    type: 'friend_joined',
    data: { friendId: userId },
  })

  logger.info(`Friend request accepted: ${fromUserId} <-> ${userId}`)
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  // Remove bidirectional friendship
  const { error } = await supabaseAdmin
    .from('friends')
    .delete()
    .or(
      `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
    )

  if (error) {
    logger.error('Failed to remove friend:', error.message)
    throw new Error('Error al eliminar amigo')
  }

  logger.info(`Friendship removed: ${userId} <-> ${friendId}`)
}

export async function blockUser(userId: string, targetId: string): Promise<void> {
  // Remove any existing friendship
  await supabaseAdmin
    .from('friends')
    .delete()
    .or(
      `and(user_id.eq.${userId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${userId})`
    )

  // Insert block record
  await supabaseAdmin.from('friends').insert({
    user_id: userId,
    friend_id: targetId,
    status: 'blocked',
  })

  logger.info(`User blocked: ${userId} blocked ${targetId}`)
}
