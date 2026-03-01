import type { Context } from 'hono'
import * as notificationsService from '../services/notifications.service.js'
import type { AppVariables } from '../types/index.js'

export async function getNotifications(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  const unreadOnly = c.req.query('unread') === 'true'
  const limit = parseInt(c.req.query('limit') || '50', 10)

  try {
    const notifications = await notificationsService.getNotifications(userId, unreadOnly, limit)
    return c.json(notifications)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function getUnreadCount(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')

  try {
    const count = await notificationsService.getUnreadCount(userId)
    return c.json({ count })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function markAsRead(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  const notificationId = c.req.param('id')

  try {
    await notificationsService.markAsRead(userId, notificationId)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function markAllAsRead(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')

  try {
    await notificationsService.markAllAsRead(userId)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function deleteNotification(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  const notificationId = c.req.param('id')

  try {
    await notificationsService.deleteNotification(userId, notificationId)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}
