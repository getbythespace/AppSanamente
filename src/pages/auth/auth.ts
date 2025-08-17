import { prisma } from 'src/lib/prisma'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)



export async function getSessionUser(req: any, res: any) {
  
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/, '')

  if (!token) return null

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return null

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    include: {
      roles: true,
    },
  })

  if (!user) return null

  return {
    ...user,
    roles: user.roles,
    organizationId: user.organizationId,
  }
}
