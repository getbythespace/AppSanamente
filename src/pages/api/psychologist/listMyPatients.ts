import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET'], ['PSYCHOLOGIST'] as AppRole[],
  async (_req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const patients = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        assignedPsychologistId: userId,
        roles: { some: { role: 'PATIENT' } }
      },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true,
        lastNameMaternal: true,
        email: true,
        rut: true,
        createdAt: true,
        assignedPsychologistId: true
      },
      orderBy: [{ firstName: 'asc' }, { lastNamePaternal: 'asc' }]
    })

    return res.json({ ok: true, data: patients })
  }
)
