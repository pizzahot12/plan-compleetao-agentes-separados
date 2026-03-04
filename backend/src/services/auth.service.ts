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

export async function loginWithProviderToken(accessToken: string): Promise<AuthResponse> {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken)

  if (error || !user) {
    logger.warn(`Google login failed (invalid Supabase token): ${error?.message}`)
    throw new Error('Token de sesion invalido')
  }

  // Get or Create profile
  let { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const isOwner = user.email === 'poloniaahumberto@gmail.com';

    // Primero entrar, crear profile esperando ser aprobado
    const { data: newProfile } = await supabaseAdmin.from('profiles').insert({
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.email!.split('@')[0],
      avatar: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
      is_approved: isOwner
    }).select().single()
    profile = newProfile
  }

  // Auto-aprobar si es el dueño y estaba pendiente
  if (profile && !profile.is_approved && user.email === 'poloniaahumberto@gmail.com') {
    await supabaseAdmin.from('profiles').update({ is_approved: true }).eq('id', user.id);
    profile.is_approved = true;
  }

  if (!profile?.is_approved) {
    throw new Error('PENDING_APPROVAL')
  }

  const userPayload = {
    id: user.id,
    email: user.email!,
    name: profile?.name || user.email!.split('@')[0],
    avatar: profile?.avatar || undefined,
    created_at: user.created_at,
  }

  const token = signToken({ userId: userPayload.id, email: userPayload.email })

  return { token, user: userPayload }
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
