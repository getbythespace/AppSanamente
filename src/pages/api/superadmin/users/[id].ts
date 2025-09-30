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

  const { id: userId } = req.query

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId as string },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              rut: true
              // REMOVED: slug field doesn't exist
            }
          },
          roles: {
            select: {
              role: true
            }
          },
          _count: {
            select: {
              // REMOVED: sessions field doesn't exist
              assignmentsAsPatient: true,
              assignmentsAsPsychologist: true,
              moodEntries: true,
              sessionNotesAsPatient: true,
              sessionNotesAsPsychologist: true
            }
          }
        }
      })

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' })
      }

      return res.json({ user })

    } catch (error) {
      console.error('Error fetching user:', error)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const { updateData } = req.body

      const updatedUser = await prisma.user.update({
        where: { id: userId as string },
        data: updateData,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              rut: true
            }
          },
          roles: {
            select: {
              role: true
            }
          }
        }
      })

      // FIXED: Sin campo details
      await prisma.auditLog.create({
        data: {
          action: 'USER_UPDATED',
          userId: authUser.id,
          targetId: userId as string,
          description: `User updated via API`
        }
      })

      return res.json({ user: updatedUser })

    } catch (error) {
      console.error('Error updating user:', error)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // FIXED: Sin campo deletedAt
      const updatedUser = await prisma.user.update({
        where: { id: userId as string },
        data: {
          status: 'DELETED'
        }
      })

      // FIXED: Sin campo details
      await prisma.auditLog.create({
        data: {
          action: 'USER_DELETED',
          userId: authUser.id,
          targetId: userId as string,
          description: `User deleted via API`
        }
      })

      return res.json({ message: 'Usuario eliminado exitosamente', user: updatedUser })

    } catch (error) {
      console.error('Error deleting user:', error)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }
  }

  return res.status(405).json({ error: 'Método no permitido' })
}