import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 🔥 DESACTIVAR AUTO-REFRESH TEMPORALMENTE
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})