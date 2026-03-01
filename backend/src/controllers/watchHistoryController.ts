import type { Context } from 'hono'
import * as watchHistoryService from '../services/watch-history.service.js'
import { watchProgressSchema } from '../utils/validators.js'
import type { AppVariables } from '../types/index.js'

export async function getHistory(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  const limit = parseInt(c.req.query('limit') || '20', 10)
  const offset = parseInt(c.req.query('offset') || '0', 10)

  try {
    const history = await watchHistoryService.getHistory(userId, limit, offset)
    return c.json(history)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function getContinueWatching(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  const limit = parseInt(c.req.query('limit') || '10', 10)

  try {
    const items = await watchHistoryService.getContinueWatching(userId, limit)
    return c.json(items)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function updateProgress(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  const body = await c.req.json()
  const parsed = watchProgressSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400)
  }

  try {
    await watchHistoryService.updateProgress(
      userId,
      parsed.data.mediaId,
      parsed.data.currentTime,
      parsed.data.duration
    )
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function getProgress(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  const mediaId = c.req.param('mediaId')

  try {
    const progress = await watchHistoryService.getProgress(userId, mediaId)
    if (!progress) {
      return c.json({ currentTime: 0, duration: 0, completed: false })
    }
    return c.json(progress)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}

export async function deleteHistoryEntry(c: Context<{ Variables: AppVariables }>) {
  const userId = c.get('userId')
  const mediaId = c.req.param('mediaId')

  try {
    await watchHistoryService.deleteHistoryEntry(userId, mediaId)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
}
