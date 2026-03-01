import type { Context } from 'hono'
import * as friendsService from '../services/friends.service.js'
import type { AppVariables } from '../types/index.js'

export async function getFriends(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')

  try {
    const friends = await friendsService.getFriends(userId)
    return c.json(friends)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function getPendingRequests(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')

  try {
    const requests = await friendsService.getPendingRequests(userId)
    return c.json(requests)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function addFriend(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  const friendUserId = c.req.param('userId')

  try {
    await friendsService.sendFriendRequest(userId, friendUserId)
    return c.json({ success: true }, 201)
  } catch (err) {
    const message = (err as Error).message
    const status = message.includes('no encontrado') ? 404
      : message.includes('Ya son') || message.includes('ya enviada') || message.includes('bloqueado') ? 400
      : message.includes('ti mismo') ? 400
      : 500
    return c.json({ error: message }, status as 400)
  }
}

export async function acceptFriend(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  const fromUserId = c.req.param('userId')

  try {
    await friendsService.acceptFriendRequest(userId, fromUserId)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400)
  }
}

export async function removeFriend(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  const friendUserId = c.req.param('userId')

  try {
    await friendsService.removeFriend(userId, friendUserId)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function blockUser(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  const targetId = c.req.param('userId')

  try {
    await friendsService.blockUser(userId, targetId)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}
