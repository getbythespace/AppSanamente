import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/utils/auth-server'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const currentUser = await getSessionUser(req, res)
    
    // Usar activeRole en lugar de roles
    if (!currentUser || !['ADMIN', 'OWNER'].includes(currentUser.activeRole || '')) {
      return res.status(403).json({ error: 'Acceso denegado' })
    }

    const { page = '1', limit = '10', search, role, status } = req.query

    const pageNum = parseInt(page as string) || 1
    const limitNum = parseInt(limit as string) || 10
    const skip = (pageNum - 1) * limitNum

    // Construir filtros
    const where: any = {
      organizationId: currentUser.organizationId
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastNamePaternal: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    if (role && role !== 'ALL') {
      if (role === 'PSYCHOLOGIST') {
        where.isPsychologist = true
      } else {
        where.activeRole = role
      }
    }

    // Obtener usuarios con paginación
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastNamePaternal: true,
          lastNameMaternal: true,
          rut: true,
          organizationId: true,
          activeRole: true,
          isPsychologist: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limitNum)

    return res.json({
      users,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    })
  } catch (error: any) {
    console.error('Error listing users:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}