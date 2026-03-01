import supabase from '../lib/database.js'
import { supabaseAdmin } from '../lib/database.js'
import type { NotificationRow, NotificationInsert } from '../types/database.js'
import logger from '../utils/logger.js'

export interface NotificationResponse {
  id: string
  type: string
  data: Record<string, unknown> | null
  read: boolean
  created_at: string
}

export async function getNotifications(
  userId: string,
  unreadOnly: boolean = false,
  limit: number = 50
): Promise<NotificationResponse[]> {
  let query = supabase
    .from('notifications')
    .select('id, type, data, read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Failed to get notifications:', error.message)
    throw new Error('Error al obtener notificaciones')
  }

  return (data || []).map((n) => ({
    id: n.id,
    type: n.type,
    data: n.data,
    read: n.read,
    created_at: n.created_at,
  }))
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) {
    logger.error('Failed to get unread count:', error.message)
    return 0
  }

  return count || 0
}

export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) {
    logger.error('Failed to mark notification as read:', error.message)
    throw new Error('Error al marcar notificacion como leida')
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) {
    logger.error('Failed to mark all notifications as read:', error.message)
    throw new Error('Error al marcar notificaciones como leidas')
  }
}

export async function createNotification(
  userId: string,
  type: NotificationInsert['type'],
  data?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    type,
    data: data || null,
  })

  if (error) {
    logger.error('Failed to create notification:', error.message)
    // Don't throw - notifications are non-critical
  }
}

export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  // Using admin client since there's no DELETE RLS policy for notifications
  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) {
    logger.error('Failed to delete notification:', error.message)
    throw new Error('Error al eliminar notificacion')
  }
}
