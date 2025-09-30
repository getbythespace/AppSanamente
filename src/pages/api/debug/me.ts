// src/pages/api/debug/me.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createPagesServerClient({ req, res })
  const { data, error } = await supabase.auth.getUser()
  res.status(200).json({ ok: !error && !!data?.user, user: data?.user ?? null, error })
}
