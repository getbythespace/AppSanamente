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
      const { search, role } = req.query

      const organizations = await prisma.organization.findMany({
        where: {
          // REMOVED: status field doesn't exist in Organization schema
          name: search ? {
            contains: search as string,
            mode: 'insensitive'
          } : undefined
        },
        include: {
          users: {
            where: {
              // REMOVED: lastLoginAt field doesn't exist in User schema
              roles: role ? {
                some: {
                  role: role as any
                }
              } : undefined
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastNamePaternal: true,
              status: true,
              roles: {
                select: {
                  role: true
                }
              }
            }
          },
          _count: {
            select: {
              users: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return res.json({ organizations })
    } catch (error) {
      console.error('Error fetching organizations:', error)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }
  }

  return res.status(405).json({ error: 'Método no permitido' })
}