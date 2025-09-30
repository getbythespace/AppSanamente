import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      return res.status(401).json({ error: error.message })
    }

    return res.json({ ok: true, session: data.session })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}