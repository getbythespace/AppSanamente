import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET'], ['PSYCHOLOGIST'] as AppRole[],
  async (_req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return res.status(401).json({ error: 'UNAUTHORIZED' })

    const patients = await prisma.user.findMany({
      where: {
        assignedPsychologistId: me.id,
        roles: { some: { role: 'PATIENT' } },
        status: 'ACTIVE'
      },
      select: {
        id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true, dob: true, email: true,
        entries: { select: { score: true, date: true }, orderBy: { date: 'desc' }, take: 1 }
      }
    })

    return res.status(200).json(patients)
  }
)
