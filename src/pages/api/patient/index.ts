import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET'], ['ADMIN','PSYCHOLOGIST','ASSISTANT'] as AppRole[],
  async (_req: NextApiRequest, res: NextApiResponse, { prisma, userId, roles }) => {
    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return res.status(401).json({ error: 'UNAUTHORIZED' })

    let patients
    if (roles.includes('PSYCHOLOGIST')) {
      patients = await prisma.user.findMany({
        where: { assignedPsychologistId: me.id, roles: { some: { role: 'PATIENT' } }, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastNamePaternal: true, email: true }
      })
    } else if (roles.includes('ADMIN') || roles.includes('ASSISTANT')) {
      patients = await prisma.user.findMany({
        where: { organizationId: me.organizationId, roles: { some: { role: 'PATIENT' } }, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastNamePaternal: true, email: true }
      })
    } else {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    return res.json(patients)
  }
)
