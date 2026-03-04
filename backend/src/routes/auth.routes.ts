import { Hono } from 'hono'
import * as authController from '../controllers/authController.js'

const routes = new Hono()

routes.post('/login', authController.login)
routes.post('/google-login', authController.googleLogin)
routes.post('/register', authController.register)
routes.post('/logout', authController.logout)

export default routes
