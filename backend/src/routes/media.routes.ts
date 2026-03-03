import { Hono } from 'hono'
import * as mediaController from '../controllers/mediaController.js'
import * as playbackController from '../controllers/playbackController.js'

const routes = new Hono()

routes.get('/list', mediaController.getMediaList)
routes.get('/status', mediaController.getJellyfinStatus)
routes.get('/image/:id/:type', mediaController.getImage)
routes.get('/:id/seasons', mediaController.getSeasons)
routes.get('/:id/episodes', mediaController.getEpisodes)
routes.get('/:id/streams', mediaController.getMediaStreams)
routes.get('/:id/playback-info', playbackController.getPlaybackInfo)
routes.get('/:id', mediaController.getMediaDetails)

export default routes
