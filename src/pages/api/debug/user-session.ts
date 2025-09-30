import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/utils/auth-server'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 [DEBUG] === DEBUG USER SESSION ===')
    
    // 1. Verificar cookies
    console.log('🍪 [DEBUG] Cookies:', req.headers.cookie ? 'Present' : 'Missing')
    
    // 2. Verificar Supabase session directamente
    const supabase = createPagesServerClient({ req, res })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('📧 [DEBUG] Supabase session:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email,
      error: sessionError?.message
    })
    
    // 3. Verificar getSessionUser
    const user = await getSessionUser(req, res)
    
    console.log('👤 [DEBUG] GetSessionUser result:', user)
    
    return res.json({
      success: true,
      debug: {
        hasCookies: !!req.headers.cookie,
        supabaseSession: {
          hasSession: !!session,
          hasUser: !!session?.user,
          email: session?.user?.email,
          error: sessionError?.message
        },
        userFromDB: user,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error: any) {
    console.error('💥 [DEBUG] Debug error:', error)
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    })
  }
}