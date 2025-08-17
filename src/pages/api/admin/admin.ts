import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET'], ['ADMIN'] as AppRole[],
  async (_req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const me = await prisma.user.findUnique({ where: { id: userId }, include: { organization: true } })
    if (!me || !me.organizationId) return res.status(404).json({ error: 'No perteneces a ninguna organización.' })

    const [users, patients, psychologists] = await Promise.all([
      prisma.user.count({ where: { organizationId: me.organizationId } }),
      prisma.user.count({ where: { organizationId: me.organizationId, roles: { some: { role: 'PATIENT' } } } }),
      prisma.user.count({ where: { organizationId: me.organizationId, roles: { some: { role: 'PSYCHOLOGIST' } } } }),
    ])

    return res.json({
      organization: { id: me.organization?.id, name: me.organization?.name, plan: me.organization?.plan },
      stats: { users, patients, psychologists }
    })
  }
)
