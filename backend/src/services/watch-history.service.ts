import { supabaseAdmin } from '../lib/database.js'
import type { WatchHistoryRow } from '../types/database.js'
import logger from '../utils/logger.js'

export interface WatchHistoryEntry {
  mediaId: string
  currentTime: number
  duration: number
  completed: boolean
  lastWatchedAt: string
}

export async function getHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<WatchHistoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('watch_history')
    .select('media_id, current_time, duration, completed, last_watched_at')
    .eq('user_id', userId)
    .order('last_watched_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    logger.error('Failed to get watch history:', error.message)
    throw new Error('Error al obtener historial')
  }

  return (data || []).map((h) => ({
    mediaId: h.media_id,
    currentTime: h.current_time,
    duration: h.duration,
    completed: h.completed,
    lastWatchedAt: h.last_watched_at,
  }))
}

export async function getContinueWatching(
  userId: string,
  limit: number = 10
): Promise<WatchHistoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('watch_history')
    .select('media_id, current_time, duration, completed, last_watched_at')
    .eq('user_id', userId)
    .eq('completed', false)
    .gt('current_time', 0)
    .order('last_watched_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('Failed to get continue watching:', error.message)
    throw new Error('Error al obtener continuar viendo')
  }

  return (data || []).map((h) => ({
    mediaId: h.media_id,
    currentTime: h.current_time,
    duration: h.duration,
    completed: h.completed,
    lastWatchedAt: h.last_watched_at,
  }))
}

export async function updateProgress(
  userId: string,
  mediaId: string,
  currentTime: number,
  duration: number
): Promise<void> {
  // Mark as completed if within last 5% of duration
  const completed = duration > 0 && currentTime >= duration * 0.95

  const { error } = await supabaseAdmin
    .from('watch_history')
    .upsert(
      {
        user_id: userId,
        media_id: mediaId,
        current_time: currentTime,
        duration,
        completed,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,media_id' }
    )

  if (error) {
    logger.error('Failed to update watch progress:', error.message)
    throw new Error('Error al actualizar progreso')
  }
}

export async function getProgress(
  userId: string,
  mediaId: string
): Promise<WatchHistoryEntry | null> {
  const { data, error } = await supabaseAdmin
    .from('watch_history')
    .select('media_id, current_time, duration, completed, last_watched_at')
    .eq('user_id', userId)
    .eq('media_id', mediaId)
    .single()

  if (error || !data) return null

  return {
    mediaId: data.media_id,
    currentTime: data.current_time,
    duration: data.duration,
    completed: data.completed,
    lastWatchedAt: data.last_watched_at,
  }
}

export async function markCompleted(userId: string, mediaId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('watch_history')
    .update({ completed: true, last_watched_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('media_id', mediaId)

  if (error) {
    logger.error('Failed to mark as completed:', error.message)
    throw new Error('Error al marcar como completado')
  }
}

export async function deleteHistoryEntry(userId: string, mediaId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('watch_history')
    .delete()
    .eq('user_id', userId)
    .eq('media_id', mediaId)

  if (error) {
    logger.error('Failed to delete history entry:', error.message)
    throw new Error('Error al eliminar entrada del historial')
  }
}
