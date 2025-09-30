import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { authenticateAndAuthorize } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' })
  }

  try {
    console.log('🔄 [ADMIN-USERS] === ADMIN USERS API CALLED ===')
    console.log('📋 [ADMIN-USERS] Method:', req.method)
    console.log('🍪 [ADMIN-USERS] Has cookies:', !!req.headers.cookie)

    // AUTH UNIFICADA - igual que owner
    const authResult = await authenticateAndAuthorize(req, res, ['ADMIN', 'OWNER', 'SUPERADMIN'])
    
    if ('error' in authResult) {
      console.log('❌ [ADMIN-USERS] Auth failed:', authResult.error)
      return res.status(authResult.status).json({ 
        ok: false, 
        error: authResult.error 
      })
    }

    const user = authResult.user
    console.log('✅ [ADMIN-USERS] User authorized:', {
      id: user.id,
      email: user.email,
      roles: user.roles,
      organizationId: user.organizationId
    })
    
    if (!user.organizationId) {
      console.log('❌ [ADMIN-USERS] User has no organization')
      return res.status(400).json({ 
        ok: false, 
        error: 'Usuario sin organización' 
      })
    }

    console.log('🏢 [ADMIN-USERS] Fetching users for organization:', user.organizationId)

    // Obtener usuarios de la organización con roles
    const users = await prisma.user.findMany({
      where: { 
        organizationId: user.organizationId 
      },
      include: {
        roles: {
          select: { role: true }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastNamePaternal: 'asc' }
      ]
    })

    console.log('👥 [ADMIN-USERS] Found users:', users.length)

    // Transformar datos para el frontend
    const transformedUsers = users.map(user => {
      // Determinar rol principal
      const roles = user.roles.map(r => r.role)
      let primaryRole = 'PATIENT'
      
      if (roles.includes('OWNER')) primaryRole = 'OWNER'
      else if (roles.includes('ADMIN')) primaryRole = 'ADMIN'
      else if (roles.includes('PSYCHOLOGIST')) primaryRole = 'PSYCHOLOGIST'
      else if (roles.includes('ASSISTANT')) primaryRole = 'ASSISTANT'

      return {
        id: user.id,
        firstName: user.firstName,
        lastNamePaternal: user.lastNamePaternal,
        lastNameMaternal: user.lastNameMaternal,
        email: user.email,
        rut: user.rut,
        role: primaryRole,
        isActive: user.status === 'ACTIVE',
        createdAt: user.createdAt.toISOString()
      }
    })

    // Estadísticas
    const stats = {
      total: users.length,
      active: users.filter(u => u.status === 'ACTIVE').length,
      inactive: users.filter(u => u.status === 'INACTIVE').length,
      pending: users.filter(u => u.status === 'PENDING').length
    }

    console.log('📊 [ADMIN-USERS] Final stats:', stats)

    return res.json({ 
      ok: true, 
      data: transformedUsers,
      stats
    })

  } catch (error: any) {
    console.error('💥 [ADMIN-USERS] Error fetching users:', error)
    return res.status(500).json({ 
      ok: false, 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}