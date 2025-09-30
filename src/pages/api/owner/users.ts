import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { authenticateAndAuthorize } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    console.log('🚀 [API] Iniciando /api/owner/users...')

    // 🔥 USAR EL MISMO MÉTODO QUE FUNCIONA EN executiveMetrics
    const authResult = await authenticateAndAuthorize(req, res, ['OWNER', 'SUPERADMIN'])
    
    if ('error' in authResult) {
      console.log('❌ [API] Auth failed:', authResult.error)
      return res.status(authResult.status).json({ 
        ok: false, 
        error: authResult.error 
      })
    }

    const user = authResult.user
    console.log('✅ [API] Usuario autenticado:', user.email, 'ID:', user.id)
    console.log('✅ [API] Acceso autorizado como OWNER')

    if (!user.organizationId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Usuario no tiene organización asignada' 
      })
    }

    console.log('🏢 Organización:', user.organizationId)

    // Obtener TODOS los usuarios de la misma organización
    const allUsers = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId
      },
      include: {
        roles: {
          select: {
            role: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    })

    console.log('📊 Usuarios encontrados:', allUsers.length)

    // Transformar datos para el frontend
    const usersWithRoles = allUsers.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastNamePaternal: user.lastNamePaternal,
      lastNameMaternal: user.lastNameMaternal,
      email: user.email,
      rut: user.rut,
      role: user.roles?.[0]?.role || 'PATIENT',
      isActive: user.status === 'ACTIVE',
      createdAt: user.createdAt.toISOString()
    }))

    console.log('✅ [API] Usuarios procesados exitosamente:', usersWithRoles.length)

    return res.json({ 
      ok: true, 
      data: usersWithRoles 
    })

  } catch (error) {
    console.error('💥 [API] Error interno:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return res.status(500).json({ 
      ok: false, 
      error: errorMessage 
    })
  }
}