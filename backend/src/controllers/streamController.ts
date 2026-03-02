import type { Context } from 'hono'
import { stream } from 'hono/streaming'
import * as jellyfinService from '../services/jellyfin.service.js'
import { qualitySchema } from '../utils/validators.js'
import type { Quality, AppVariables } from '../types/index.js'
import logger from '../utils/logger.js'

export async function getStream(c: Context<{ Variables: AppVariables }>) {
  const mediaId = c.req.param('mediaId')
  const qualityInput = c.req.query('quality') || '720p'
  const audioIndex = c.req.query('audioIndex')
  const subtitleIndex = c.req.query('subtitleIndex')

  const parsed = qualitySchema.safeParse(qualityInput)
  if (!parsed.success) {
    return c.json({ error: 'Calidad invalida. Opciones: 360p, 480p, 720p, 1080p' }, 400)
  }

  try {
    const streamOptions = {
      audioStreamIndex: audioIndex ? parseInt(audioIndex, 10) : undefined,
      subtitleStreamIndex: subtitleIndex ? parseInt(subtitleIndex, 10) : undefined,
    }

    const streamUrl = jellyfinService.getStreamUrl(mediaId, streamOptions)
    logger.info(`Proxying stream from Jellyfin: ${mediaId}`)

    const response = await fetch(streamUrl)

    if (!response.ok) {
      throw new Error(`Jellyfin returned ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || 'video/mp4'
    c.header('Content-Type', contentType)
    c.header('Cache-Control', 'no-cache')
    c.header('Accept-Ranges', 'bytes')

    return stream(c, async (stream) => {
      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          await stream.write(value)
        }
      } catch (err) {
        logger.error('Stream proxy error:', (err as Error).message)
      } finally {
        reader.releaseLock()
      }
    })
  } catch (err) {
    logger.error('Stream proxy failed:', (err as Error).message)
    return c.json({ error: 'Error al obtener stream' }, 500)
  }
}
