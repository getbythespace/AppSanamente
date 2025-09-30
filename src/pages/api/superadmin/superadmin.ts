import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = await getSessionUser(req, res)
  
  if (!authUser) {
    return res.status(401).json({ error: 'No autenticado' })
  }

  const isSuperAdmin = authUser.roles?.some((r: any) => r.role === 'SUPERADMIN')
  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Solo superadmins pueden acceder' })
  }

  if (req.method === 'GET') {
    try {
      const { search, role, status, page = 1, limit = 10 } = req.query

      const skip = (Number(page) - 1) * Number(limit)

      const users = await prisma.user.findMany({
        where: {
          // REMOVED: lastLoginAt field doesn't exist in User schema
          OR: search ? [
            { email: { contains: search as string, mode: 'insensitive' } },
            { firstName: { contains: search as string, mode: 'insensitive' } },
            { lastNamePaternal: { contains: search as string, mode: 'insensitive' } }
          ] : undefined,
          roles: role ? {
            some: {
              role: role as any
            }
          } : undefined,
          status: status ? status as any : undefined
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          },
          roles: {
            select: {
              role: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: {
          createdAt: 'desc'
        }
      })

      const totalUsers = await prisma.user.count({
        where: {
          OR: search ? [
            { email: { contains: search as string, mode: 'insensitive' } },
            { firstName: { contains: search as string, mode: 'insensitive' } },
            { lastNamePaternal: { contains: search as string, mode: 'insensitive' } }
          ] : undefined,
          roles: role ? {
            some: {
              role: role as any
            }
          } : undefined,
          status: status ? status as any : undefined
        }
      })

      return res.json({
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / Number(limit))
        }
      })
    } catch (error) {
      console.error('Error fetching users:', error)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }
  }

  return res.status(405).json({ error: 'Método no permitido' })
}