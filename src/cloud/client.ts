import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const cloudConfigured = Boolean(projectUrl && publishableKey)

export const supabase = cloudConfigured
  ? createClient<Database>(projectUrl!, publishableKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null
