import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const authUser = await getSessionUser(req, res)
  
  if (!authUser) {
    return res.status(401).json({ error: 'No autenticado' })
  }

  const isSuperAdmin = authUser.roles?.some((r: any) => r.role === 'SUPERADMIN')
  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Solo superadmins pueden actualizar usuarios' })
  }

  try {
    const { userId, updateData } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' })
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // REMOVED: specialties property doesn't exist in User schema
    // No longer trying to access user.specialties

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            rut: true
            // REMOVED: slug field doesn't exist in Organization schema
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
        action: 'USER_UPDATED',
        userId: authUser.id,
        targetId: userId,
        description: `User ${user.email} updated`
      }
    })

    return res.json({ user: updatedUser })

  } catch (error) {
    console.error('Error updating user:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}