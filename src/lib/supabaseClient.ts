// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

declare global {
  // eslint-disable-next-line no-var
  var __sbClient__: SupabaseClient | undefined
  // eslint-disable-next-line no-var
  var __sbAuthHookInstalled__: boolean | undefined
}

export const supabase =
  globalThis.__sbClient__ ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      // IMPORTANTE: mantener autoRefresh activado en producción
      autoRefreshToken: true,
      flowType: 'pkce',
    },
  })

if (process.env.NODE_ENV !== 'production') globalThis.__sbClient__ = supabase

// (Opcional) asegura que solo registremos 1 hook global de auth
if (!globalThis.__sbAuthHookInstalled__) {
  globalThis.__sbAuthHookInstalled__ = true
  // ningún listener aquí para no spamear — tu hook ya controla fetch a /api/auth/me
}
