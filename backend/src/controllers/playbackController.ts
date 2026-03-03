import type { Context } from 'hono'
import * as jellyfinService from '../services/jellyfin.service.js'
import type { AppVariables } from '../types/index.js'
import logger from '../utils/logger.js'

const BITRATE_MAP = [
    { kbps: 20000, label: '1080p (20 Mbps)', maxW: 1920, maxH: 1080, id: 108020 },
    { kbps: 12000, label: '1080p (12 Mbps)', maxW: 1920, maxH: 1080, id: 108012 },
    { kbps: 8000, label: '720p  (8 Mbps)', maxW: 1280, maxH: 720, id: 72008 },
    { kbps: 4000, label: '720p  (4 Mbps)', maxW: 1280, maxH: 720, id: 72004 },
    { kbps: 2000, label: '480p  (2 Mbps)', maxW: 720, maxH: 480, id: 48002 },
    { kbps: 720, label: '360p  (720 kbps)', maxW: 480, maxH: 320, id: 36000 },
    { kbps: 320, label: '240p  (320 kbps)', maxW: 480, maxH: 240, id: 24000 },
]

/**
 * GET /api/media/:id/playback-info?audioIndex=N&subtitleIndex=N
 *
 * Asks Jellyfin for MediaSources for a given item, then builds all
 * HLS transcoding URLs server-side (so the JELLYFIN_API_KEY never
 * reaches the browser). Returns ready-to-use Plyr sources[], quality
 * labels, audio streams and subtitle streams.
 */
export async function getPlaybackInfo(c: Context<{ Variables: AppVariables }>) {
    const mediaId = c.req.param('id')
    const audioIndex = c.req.query('audioIndex')
    const subtitleIndex = c.req.query('subtitleIndex')

    try {
        const info = await jellyfinService.getPlaybackInfo(
            mediaId,
            audioIndex !== undefined ? parseInt(audioIndex, 10) : undefined,
            subtitleIndex !== undefined ? parseInt(subtitleIndex, 10) : undefined,
        )
        return c.json(info)
    } catch (err) {
        logger.error('getPlaybackInfo error:', (err as Error).message)
        return c.json({ error: 'Error al obtener información de reproducción' }, 500)
    }
}
