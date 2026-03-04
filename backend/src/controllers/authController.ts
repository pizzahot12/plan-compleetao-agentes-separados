import type { Context } from 'hono'
import * as authService from '../services/auth.service.js'
import { loginSchema, registerSchema, googleLoginSchema } from '../utils/validators.js'

export async function login(c: Context) {
  const body = await c.req.json()
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400)
  }

  try {
    const result = await authService.login(parsed.data.email, parsed.data.password)
    return c.json(result)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 401)
  }
}

export async function googleLogin(c: Context) {
  const body = await c.req.json()
  const parsed = googleLoginSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400)
  }

  try {
    const result = await authService.loginWithProviderToken(parsed.data.access_token)
    return c.json(result)
  } catch (err) {
    if ((err as Error).message === 'PENDING_APPROVAL') {
      return c.json({ error: 'Tu cuenta esta en lista de espera y debe ser aprobada por el administrador.' }, 403)
    }
    return c.json({ error: (err as Error).message }, 401)
  }
}

export async function register(c: Context) {
  const body = await c.req.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400)
  }

  try {
    const result = await authService.register(
      parsed.data.email,
      parsed.data.password,
      parsed.data.name
    )
    return c.json(result, 201)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400)
  }
}

export async function logout(c: Context) {
  // JWT is stateless - client just discards the token
  // Could add token blacklisting later if needed
  return c.json({ success: true })
}
