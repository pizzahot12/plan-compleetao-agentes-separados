import { supabaseAdmin } from '../lib/database.js'
import type { MediaInsert } from '../types/database.js'
import type { MediaItem, MediaDetails } from '../types/index.js'
import logger from '../utils/logger.js'

// Cache TTL: 1 hour
const CACHE_TTL_MS = 60 * 60 * 1000

export async function getCachedMedia(mediaId: string): Promise<MediaItem | null> {
  const { data, error } = await supabaseAdmin
    .from('media')
    .select('*')
    .eq('id', mediaId)
    .single()

  if (error || !data) return null

  // Check if cache is stale
  const cachedAt = new Date(data.cached_at).getTime()
  if (Date.now() - cachedAt > CACHE_TTL_MS) {
    return null // Stale cache, caller should refresh
  }

  return {
    id: data.id,
    title: data.title,
    poster: data.poster_url || '',
    backdrop: data.backdrop_url || '',
    rating: data.rating,
    year: data.year || 0,
    duration: data.duration || 0,
    synopsis: data.synopsis || '',
    genres: data.genres || [],
    type: data.type || 'movie',
  }
}

export async function getCachedMediaList(
  type: string,
  skip: number,
  limit: number
): Promise<MediaItem[] | null> {
  const typeFilter = type === 'all' ? undefined : type === 'series' ? 'series' : 'movie'

  let query = supabaseAdmin
    .from('media')
    .select('*')
    .order('title', { ascending: true })
    .range(skip, skip + limit - 1)

  if (typeFilter) {
    query = query.eq('type', typeFilter)
  }

  const { data, error } = await query

  if (error || !data || data.length === 0) return null

  // Check if any items are stale
  const now = Date.now()
  const allFresh = data.every(
    (item) => now - new Date(item.cached_at).getTime() < CACHE_TTL_MS
  )

  if (!allFresh) return null // Some items stale, caller should refresh

  return data.map((item) => ({
    id: item.id,
    title: item.title,
    poster: item.poster_url || '',
    backdrop: item.backdrop_url || '',
    rating: item.rating,
    year: item.year || 0,
    duration: item.duration || 0,
    synopsis: item.synopsis || '',
    genres: item.genres || [],
    type: item.type || 'movie',
  }))
}

export async function cacheMedia(media: MediaItem, type: 'movie' | 'series' = 'movie'): Promise<void> {
  const row: MediaInsert = {
    id: media.id,
    jellyfin_id: media.id,
    title: media.title,
    type,
    poster_url: media.poster || null,
    backdrop_url: media.backdrop || null,
    synopsis: media.synopsis || null,
    rating: media.rating,
    year: media.year || null,
    duration: media.duration || null,
    genres: media.genres || null,
    cached_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from('media')
    .upsert(row, { onConflict: 'id' })

  if (error) {
    logger.error('Failed to cache media:', error.message)
    // Non-critical error, don't throw
  }
}

export async function cacheMediaDetails(
  details: MediaDetails,
  type: 'movie' | 'series' = 'movie'
): Promise<void> {
  const row: MediaInsert = {
    id: details.id,
    jellyfin_id: details.id,
    title: details.title,
    type,
    poster_url: details.poster || null,
    backdrop_url: details.backdrop || null,
    synopsis: details.synopsis || null,
    rating: details.rating,
    year: details.year || null,
    duration: details.duration || null,
    genres: details.genres || null,
    cast: details.cast?.map((c) => `${c.name}|${c.role}`) || null,
    subtitles: details.subtitles || null,
    audio: details.audio || null,
    cached_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from('media')
    .upsert(row, { onConflict: 'id' })

  if (error) {
    logger.error('Failed to cache media details:', error.message)
  }
}

export async function cacheMediaBatch(
  items: MediaItem[],
  type: 'movie' | 'series' = 'movie'
): Promise<void> {
  if (items.length === 0) return

  const rows: MediaInsert[] = items.map((item) => ({
    id: item.id,
    jellyfin_id: item.id,
    title: item.title,
    type,
    poster_url: item.poster || null,
    backdrop_url: item.backdrop || null,
    synopsis: item.synopsis || null,
    rating: item.rating,
    year: item.year || null,
    duration: item.duration || null,
    genres: item.genres || null,
    cached_at: new Date().toISOString(),
  }))

  const { error } = await supabaseAdmin
    .from('media')
    .upsert(rows, { onConflict: 'id' })

  if (error) {
    logger.error('Failed to cache media batch:', error.message)
  } else {
    logger.debug(`Cached ${items.length} media items`)
  }
}

export async function invalidateCache(mediaId: string): Promise<void> {
  // Set cached_at to epoch to force refresh
  const { error } = await supabaseAdmin
    .from('media')
    .update({ cached_at: new Date(0).toISOString() })
    .eq('id', mediaId)

  if (error) {
    logger.error('Failed to invalidate media cache:', error.message)
  }
}
