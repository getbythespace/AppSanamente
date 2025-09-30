import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const authUser = await getSessionUser(req, res)
  
  if (!authUser) {
    return res.status(401).json({ error: 'No autenticado' })
  }

  const isSuperAdmin = authUser.roles?.some((r: any) => r.role === 'SUPERADMIN')
  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Solo superadmins pueden eliminar usuarios' })
  }

  try {
    const { userId } = req.body

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

    // FIXED: Soft delete - cambiar status a DELETED (deletedAt no existe en schema)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED'
      }
    })

    // FIXED: Crear log de auditoría sin campo details (no existe en schema)
    await prisma.auditLog.create({
      data: {
        action: 'USER_DELETED',
        userId: authUser.id,
        targetId: userId,
        description: `User ${user.email} deleted`
      }
    })

    return res.json({ message: 'Usuario eliminado exitosamente', user: updatedUser })

  } catch (error) {
    console.error('Error deleting user:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}