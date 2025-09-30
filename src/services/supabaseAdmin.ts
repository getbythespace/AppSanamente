// import { createClient } from '@supabase/supabase-js'

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
// if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

// export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
//   auth: {
//     autoRefreshToken: false,
//     persistSession: false
//   }
// })

// src/lib/supabaseAdmin.ts
// ⚠️ Solo usar en el servidor (API routes, getServerSideProps, scripts).
// Usa la SERVICE ROLE KEY para poder invitar usuarios, etc.

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) {
  throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL en el .env')
}
if (!serviceRoleKey) {
  throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el .env')
}

// Evitar recrear el cliente en dev (HMR)
declare global {
  // eslint-disable-next-line no-var
  var _supabaseAdmin: SupabaseClient | undefined
}

export const supabaseAdmin =
  global._supabaseAdmin ??
  createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

if (process.env.NODE_ENV !== 'production') {
  global._supabaseAdmin = supabaseAdmin
}
