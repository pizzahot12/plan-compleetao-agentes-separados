import type { Context } from 'hono'
import * as jellyfinService from '../services/jellyfin.service.js'
import * as cacheService from '../services/media-cache.service.js'
import { mediaListQuerySchema } from '../utils/validators.js'
import logger from '../utils/logger.js'

export async function getMediaList(c: Context) {
  const query = mediaListQuerySchema.safeParse({
    type: c.req.query('type'),
    skip: c.req.query('skip'),
    limit: c.req.query('limit'),
  })

  if (!query.success) {
    return c.json({ error: query.error.errors[0].message }, 400)
  }

  try {
    // Always fetch fresh data from Jellyfin (bypass cache for now)
    const media = await jellyfinService.getMediaList(
      query.data.type,
      query.data.skip,
      query.data.limit
    )

    // Cache in background
    const type = query.data.type === 'series' ? 'series' : 'movie'
    cacheService.cacheMediaBatch(media, type as 'movie' | 'series').catch(() => { })

    return c.json(media)
  } catch (err) {
    logger.error('getMediaList error:', (err as Error).message)
    return c.json({ error: 'Error al obtener contenido' }, 500)
  }
}

export async function getMediaDetails(c: Context) {
  const id = c.req.param('id')

  try {
    // jellyfin.service has RAM cache (10 min TTL) — no Supabase roundtrip needed
    const details = await jellyfinService.getMediaDetails(id)

    // Cache background write to Supabase (non-blocking)
    cacheService.cacheMediaDetails(details).catch(() => { })

    // Tell browser/CDN to cache response for 5 minutes
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    return c.json(details)
  } catch (err) {
    logger.error('getMediaDetails error:', (err as Error).message)
    return c.json({ error: 'Contenido no encontrado' }, 404)
  }
}

export async function getSeasons(c: Context) {
  const seriesId = c.req.param('id')

  try {
    const seasons = await jellyfinService.getSeasons(seriesId)
    return c.json(seasons)
  } catch (err) {
    logger.error('getSeasons error:', (err as Error).message)
    return c.json({ error: 'Error al obtener temporadas' }, 500)
  }
}

export async function getEpisodes(c: Context) {
  const seriesId = c.req.param('id')
  const seasonId = c.req.query('seasonId')

  try {
    const episodes = await jellyfinService.getEpisodes(seriesId, seasonId || undefined)
    return c.json(episodes)
  } catch (err) {
    logger.error('getEpisodes error:', (err as Error).message)
    return c.json({ error: 'Error al obtener episodios' }, 500)
  }
}

export async function getMediaStreams(c: Context) {
  const mediaId = c.req.param('id')

  try {
    const streams = await jellyfinService.getMediaStreams(mediaId)
    return c.json(streams)
  } catch (err) {
    logger.error('getMediaStreams error:', (err as Error).message)
    return c.json({ error: 'Error al obtener streams de media' }, 500)
  }
}

export async function getImage(c: Context) {
  const itemId = c.req.param('id')
  const imageType = (c.req.param('type') || 'Primary') as 'Primary' | 'Backdrop' | 'Logo' | 'Thumb'
  const maxWidth = c.req.query('maxWidth')

  const validTypes = ['Primary', 'Backdrop', 'Logo', 'Thumb']
  if (!validTypes.includes(imageType)) {
    return c.json({ error: 'Tipo de imagen invalido' }, 400)
  }

  try {
    const imageUrl = jellyfinService.getImageUrl(
      itemId,
      imageType,
      maxWidth ? parseInt(maxWidth, 10) : undefined
    )

    if (!imageUrl) {
      return c.json({ error: 'Imagen no disponible' }, 404)
    }

    const response = await fetch(imageUrl)

    if (!response.ok) {
      return c.json({ error: 'Imagen no encontrada' }, 404)
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()

    c.header('Content-Type', contentType)
    c.header('Cache-Control', 'public, max-age=86400')

    return c.body(buffer)
  } catch (err) {
    logger.error('getImage error:', (err as Error).message)
    return c.json({ error: 'Error al obtener imagen' }, 500)
  }
}

export async function getJellyfinStatus(c: Context) {
  try {
    const status = await jellyfinService.checkConnection()
    return c.json({
      ...status,
      configured: jellyfinService.isConfigured(),
    })
  } catch (err) {
    return c.json({
      connected: false,
      error: (err as Error).message,
    })
  }
}

export async function getSubtitle(c: Context) {
  const mediaId = c.req.param('id')
  const index = c.req.param('index')

  if (!mediaId || !index) return c.json({ error: 'Faltan parámetros' }, 400)

  try {
    const url = jellyfinService.getSubtitleUrl(mediaId, parseInt(index, 10))
    if (!url) return c.json({ error: 'Servidor no configurado' }, 500)

    const response = await fetch(url)
    if (!response.ok) return c.json({ error: 'No se encontró el subtítulo' }, 404)

    // We proxy the content as text/vtt
    const content = await response.text()

    // Adding standard VTT header in case it doesn't have it (optional, but good measure)
    c.header('Content-Type', 'text/vtt; charset=utf-8')
    c.header('Access-Control-Allow-Origin', '*') // Allow browsers to fetch track with crossorigin="anonymous"
    return c.body(content)
  } catch (err) {
    logger.error('getSubtitle error:', (err as Error).message)
    return c.json({ error: 'Error interno obteniendo subtitulo' }, 500)
  }
}
