// src/pages/api/admin/users.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { authenticateAndAuthorize } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' })
  }

  try {
    const auth = await authenticateAndAuthorize(req, res, ['ADMIN', 'OWNER', 'SUPERADMIN'])
    if ('error' in auth) {
      return res.status(auth.status).json({ ok: false, error: auth.error })
    }
    const me = auth.user
    if (!me.organizationId) {
      return res.status(400).json({ ok: false, error: 'Usuario sin organización' })
    }

    const org = await prisma.organization.findUnique({
      where: { id: me.organizationId },
      select: { plan: true }
    })

    const users = await prisma.user.findMany({
      where: { organizationId: me.organizationId },
      include: { roles: { select: { role: true } } },
      orderBy: [{ firstName: 'asc' }, { lastNamePaternal: 'asc' }]
    })

    const transformed = users.map(u => {
      const roles = u.roles.map(r => r.role)
      let primaryRole: any = 'PATIENT'
      if (roles.includes('OWNER')) primaryRole = 'OWNER'
      else if (roles.includes('ADMIN')) primaryRole = 'ADMIN'
      else if (roles.includes('PSYCHOLOGIST')) primaryRole = 'PSYCHOLOGIST'
      else if (roles.includes('ASSISTANT')) primaryRole = 'ASSISTANT'

      return {
        id: u.id,
        firstName: u.firstName,
        lastNamePaternal: u.lastNamePaternal,
        lastNameMaternal: u.lastNameMaternal,
        email: u.email,
        rut: u.rut,
        role: primaryRole,
        isActive: u.status === 'ACTIVE',
        createdAt: u.createdAt.toISOString()
      }
    })

    const stats = {
      total: users.length,
      active: users.filter(u => u.status === 'ACTIVE').length,
      inactive: users.filter(u => u.status === 'INACTIVE').length,
      pending: users.filter(u => u.status === 'PENDING').length
    }

    return res.json({ ok: true, data: transformed, stats, orgPlan: org?.plan || 'TEAM' })
  } catch (e: any) {
    console.error('💥 [ADMIN-USERS]', e)
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
}
