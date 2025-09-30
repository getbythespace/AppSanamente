import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const authUser = await getSessionUser(req, res)
  
  if (!authUser) {
    return res.status(401).json({ error: 'No autenticado' })
  }

  const isSuperAdmin = authUser.roles?.some((r: any) => r.role === 'SUPERADMIN')
  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Solo superadmins pueden ver logs' })
  }

  try {
    const { id: userId } = req.query
    const { page = 1, limit = 20 } = req.query

    const skip = (Number(page) - 1) * Number(limit)

    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { userId: userId as string },
          { targetId: userId as string }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastNamePaternal: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: Number(limit)
    })

    const totalLogs = await prisma.auditLog.count({
      where: {
        OR: [
          { userId: userId as string },
          { targetId: userId as string }
        ]
      }
    })

    // FIXED: Crear log de auditoría sin campo details (no existe en schema)
    await prisma.auditLog.create({
      data: {
        action: 'USER_LOGS_VIEWED',
        userId: authUser.id,
        targetId: userId as string,
        description: `User logs viewed`
      }
    })

    return res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalLogs,
        totalPages: Math.ceil(totalLogs / Number(limit))
      }
    })

  } catch (error) {
    console.error('Error fetching user logs:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}