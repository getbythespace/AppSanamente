
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! 
)

function getAccessToken(req: NextApiRequest): string | undefined {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  
  const cookie = req.headers.cookie || ''
  const match = cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : undefined
}


export async function getSessionUser(req: NextApiRequest, _res: NextApiResponse) {
  const token = getAccessToken(req)
  if (!token) return null

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    include: {
      roles: true,
      organization: { select: { id: true, plan: true } }
    }
  })
  return user
}
