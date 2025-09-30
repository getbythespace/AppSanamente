import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/utils/auth-server'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const currentUser = await getSessionUser(req, res)
    
    // Usar activeRole en lugar de roles
    if (!currentUser || currentUser.activeRole !== 'OWNER') {
      return res.status(403).json({ error: 'Acceso denegado' })
    }

    const { email, firstName, lastNamePaternal, lastNameMaternal, rut } = req.body

    if (!email || !firstName || !lastNamePaternal) {
      return res.status(400).json({ error: 'Datos requeridos faltantes' })
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' })
    }

    const newAdmin = await prisma.user.create({
      data: {
        email,
        firstName,
        lastNamePaternal,
        lastNameMaternal: lastNameMaternal || '',
        rut: rut || '',
        organizationId: currentUser.organizationId,
        activeRole: 'ADMIN',
        isPsychologist: false
      },
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

    return res.json(newAdmin)
  } catch (error: any) {
    console.error('Error creating admin:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}