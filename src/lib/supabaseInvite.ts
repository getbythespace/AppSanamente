// src/lib/supabaseInvite.ts
import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabaseInvite = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      // MUY IMPORTANTE: que no pise la sesión del admin
      storageKey: 'sb-invite-session',
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)
