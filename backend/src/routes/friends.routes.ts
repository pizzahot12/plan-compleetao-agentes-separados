import { Hono } from 'hono'
import * as friendsController from '../controllers/friendsController.js'
import type { AppVariables } from '../types/index.js'

const routes = new Hono<{ Variables: AppVariables }>()

routes.get('/', friendsController.getFriends)
routes.get('/pending', friendsController.getPendingRequests)
routes.post('/:userId/add', friendsController.addFriend)
routes.post('/:userId/accept', friendsController.acceptFriend)
routes.delete('/:userId', friendsController.removeFriend)
routes.post('/:userId/block', friendsController.blockUser)

export default routes
