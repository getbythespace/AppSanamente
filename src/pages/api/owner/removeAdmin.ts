import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/utils/auth-server'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const currentUser = await getSessionUser(req, res)
    
    // Usar activeRole en lugar de roles
    if (!currentUser || currentUser.activeRole !== 'OWNER') {
      return res.status(403).json({ error: 'Acceso denegado' })
    }

    const { adminId } = req.body

    if (!adminId) {
      return res.status(400).json({ error: 'ID de administrador requerido' })
    }

    // Verificar que el admin pertenece a la misma organización
    const adminToRemove = await prisma.user.findFirst({
      where: {
        id: adminId,
        organizationId: currentUser.organizationId,
        activeRole: 'ADMIN'
      }
    })

    if (!adminToRemove) {
      return res.status(404).json({ error: 'Administrador no encontrado' })
    }

    // Cambiar rol a null (remover permisos de admin)
    const updatedUser = await prisma.user.update({
      where: { id: adminId },
      data: { activeRole: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastNamePaternal: true,
        organizationId: true,
        activeRole: true,
        isPsychologist: true
      }
    })

    return res.json({ 
      success: true, 
      message: 'Administrador removido exitosamente',
      user: updatedUser
    })
  } catch (error: any) {
    console.error('Error removing admin:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}