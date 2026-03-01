import { Hono } from 'hono'
import * as notificationsController from '../controllers/notificationsController.js'
import type { AppVariables } from '../types/index.js'

const routes = new Hono<{ Variables: AppVariables }>()

routes.get('/', notificationsController.getNotifications)
routes.get('/unread-count', notificationsController.getUnreadCount)
routes.put('/:id/read', notificationsController.markAsRead)
routes.put('/read-all', notificationsController.markAllAsRead)
routes.delete('/:id', notificationsController.deleteNotification)

export default routes
