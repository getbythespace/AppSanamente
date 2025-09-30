import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticateAndAuthorize } from '@/utils/auth-server'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('=== [ADMIN-STATS] ADMIN STATS API ===')
    
    // AUTH UNIFICADA
    const authResult = await authenticateAndAuthorize(req, res, ['ADMIN', 'OWNER', 'SUPERADMIN'])
    
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error })
    }

    const user = authResult.user
    console.log('✅ [ADMIN-STATS] User authorized:', user.email, 'Roles:', user.roles)

    // OBTENER ESTADÍSTICAS BÁSICAS
    const [
      totalUsers,
      usersWithOrg,
      usersWithoutOrg,
      totalRoles,
      totalOrganizations
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { organizationId: { not: null } } }),
      prisma.user.count({ where: { organizationId: null } }),
      prisma.userRole.count(),
      prisma.organization.count()
    ])

    console.log('📊 [ADMIN-STATS] Basic stats:', { totalUsers, usersWithOrg, usersWithoutOrg, totalRoles, totalOrganizations })

    // CONTAR POR ROLES
    const roleStats = await prisma.userRole.groupBy({
      by: ['role'],
      _count: { role: true }
    })

    // ESTADÍSTICAS POR ORGANIZACIÓN DEL USER
    let orgStats = null
    if (user.organizationId) {
      orgStats = {
        usersInMyOrg: await prisma.user.count({
          where: { organizationId: user.organizationId }
        }),
        rolesInMyOrg: await prisma.userRole.count({
          where: { user: { organizationId: user.organizationId } }
        })
      }
      console.log('🏢 [ADMIN-STATS] Org stats:', orgStats)
    }

    return res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          withOrganization: usersWithOrg,
          withoutOrganization: usersWithoutOrg
        },
        roles: {
          total: totalRoles,
          byType: roleStats.reduce((acc, item) => {
            acc[item.role] = item._count.role
            return acc
          }, {} as Record<string, number>)
        },
        organizations: {
          total: totalOrganizations
        },
        currentUserOrg: orgStats
      },
      currentUser: {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        roles: user.roles
      }
    })

  } catch (error: any) {
    console.error('💥 [ADMIN-STATS] Error getting stats:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}