import { Hono } from 'hono'
import * as watchHistoryController from '../controllers/watchHistoryController.js'
import type { AppVariables } from '../types/index.js'

const routes = new Hono<{ Variables: AppVariables }>()

routes.get('/', watchHistoryController.getHistory)
routes.get('/continue', watchHistoryController.getContinueWatching)
routes.post('/progress', watchHistoryController.updateProgress)
routes.get('/progress/:mediaId', watchHistoryController.getProgress)
routes.delete('/:mediaId', watchHistoryController.deleteHistoryEntry)

export default routes
