import type { Context } from 'hono'
import * as jellyfinService from '../services/jellyfin.service.js'
import { qualitySchema } from '../utils/validators.js'
import type { AppVariables } from '../types/index.js'
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

    // Redirect directly to Jellyfin — do NOT proxy video through Render.
    // Proxying causes: QUIC errors, 60s timeouts (Render Free Tier), and wastes 512MB RAM.
    // The browser will connect directly to Jellyfin for the actual video data.
    const streamUrl = jellyfinService.getStreamUrl(mediaId, streamOptions)
    logger.info(`Redirecting stream to Jellyfin direct: ${mediaId}`)

    return c.redirect(streamUrl, 302)
  } catch (err) {
    logger.error('Stream redirect failed:', (err as Error).message)
    return c.json({ error: 'Error al obtener stream' }, 500)
  }
}

