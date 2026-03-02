import { supabaseAdmin } from '../lib/database.js'
import { signToken } from '../lib/jwt.js'
import type { AuthResponse } from '../types/index.js'
import logger from '../utils/logger.js'

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    logger.warn(`Login failed for ${email}: ${error?.message}`)
    throw new Error('Credenciales invalidas')
  }

  // Get user profile from our profiles table
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  const user = {
    id: data.user.id,
    email: data.user.email!,
    name: profile?.name || data.user.email!.split('@')[0],
    avatar: profile?.avatar || undefined,
    created_at: data.user.created_at,
  }

  const token = signToken({ userId: user.id, email: user.email })

  return { token, user }
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  // Create auth user in Supabase
  const { data, error } = await supabaseAdmin.auth.signUp({
    email,
    password,
  })

  if (error || !data.user) {
    logger.warn(`Register failed for ${email}: ${error?.message}`)
    throw new Error(error?.message || 'Error al registrar')
  }

  // Create profile
  await supabaseAdmin.from('profiles').insert({
    id: data.user.id,
    name,
    email,
  })

  const user = {
    id: data.user.id,
    email,
    name,
    created_at: data.user.created_at!,
  }

  const token = signToken({ userId: user.id, email })

  return { token, user }
}
