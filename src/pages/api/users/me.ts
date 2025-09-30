import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const supabase = createServerSupabaseClient({ req, res })
    
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user?.email) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        roles: {
          select: {
            role: true
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // FORMATO ORIGINAL QUE FUNCIONABA
    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastNamePaternal: user.lastNamePaternal,
      lastNameMaternal: user.lastNameMaternal,
      organizationId: user.organizationId,
      status: user.status,
      roles: user.roles
    })

  } catch (error: any) {
    console.error('Error in /api/users/me:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}