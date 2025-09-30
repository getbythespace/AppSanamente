import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const authUser = await getSessionUser(req, res)
  
  if (!authUser) {
    return res.status(401).json({ error: 'No autenticado' })
  }

  const isSuperAdmin = authUser.roles?.some((r: any) => r.role === 'SUPERADMIN')
  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Solo superadmins pueden cambiar estados' })
  }

  try {
    const { userId, status } = req.body

    if (!userId || !status) {
      return res.status(400).json({ error: 'userId y status son requeridos' })
    }

    if (!['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' })
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // Actualizar el estado del usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
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
      }
    })

    // FIXED: Crear log de auditoría sin campo details (no existe en schema)
    await prisma.auditLog.create({
      data: {
        action: 'USER_STATUS_CHANGED',
        userId: authUser.id,
        targetId: userId,
        description: `Status changed to ${status}`
      }
    })

    return res.json({ user: updatedUser })

  } catch (error) {
    console.error('Error changing user status:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}