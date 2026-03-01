import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('WARNING: SUPABASE_URL or SUPABASE_ANON_KEY not set. Database calls will fail.')
}

// Anon client - respects RLS policies
// Use for operations on behalf of authenticated users
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Service role client - bypasses RLS
// Use for backend-only operations (notifications, media cache, admin tasks)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export default supabase
