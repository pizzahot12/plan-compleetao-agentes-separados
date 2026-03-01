import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Password minimo 6 caracteres'),
})

export const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Password minimo 6 caracteres'),
  name: z.string().min(2, 'Nombre minimo 2 caracteres').max(50),
})

export const createRoomSchema = z.object({
  mediaId: z.string().min(1),
  name: z.string().min(1).max(100),
  isPrivate: z.boolean().default(false),
})

export const chatMessageSchema = z.object({
  text: z.string().min(1).max(500),
})

export const qualitySchema = z.enum(['360p', '480p', '720p', '1080p']).default('720p')

export const mediaListQuerySchema = z.object({
  type: z.enum(['movies', 'series', 'all']).default('movies'),
  skip: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export const watchProgressSchema = z.object({
  mediaId: z.string().min(1, 'mediaId requerido'),
  currentTime: z.number().min(0, 'currentTime debe ser >= 0'),
  duration: z.number().min(0, 'duration debe ser >= 0'),
})
