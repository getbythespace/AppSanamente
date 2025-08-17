// pages/api/users/me.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  if (!token) return res.status(401).json({ error: 'Missing bearer token' })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' })

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    include: {
      roles: true,
      organization: { select: { id: true, name: true, plan: true } }
    }
  })

  if (!user) return res.status(404).json({ error: 'User not found' })

  return res.status(200).json({
    id: user.id,
    email: user.email,
    roles: user.roles.map(r => r.role),
    organizationId: user.organizationId,
    organization: user.organization
  })
}



