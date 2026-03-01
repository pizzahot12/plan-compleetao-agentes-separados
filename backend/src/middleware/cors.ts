import { cors } from 'hono/cors'

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

const isAllowedOrigin = (origin: string): boolean => {
  if (allowedOrigins.includes(origin)) return true
  if (origin.includes('vercel.app') || origin.includes('localhost')) return true
  return false
}

export const corsMiddleware = cors({
  origin: (origin) => {
    if (isAllowedOrigin(origin)) return origin
    return allowedOrigins[0]
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400,
})

export default corsMiddleware
