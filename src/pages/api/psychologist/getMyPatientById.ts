import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET'], ['PSYCHOLOGIST'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const patientId = req.query.id as string
    if (!patientId) return res.status(400).json({ error: 'Id requerido' })

    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return res.status(401).json({ error: 'UNAUTHORIZED' })

    const patient = await prisma.user.findFirst({
      where: {
        id: patientId,
        assignedPsychologistId: me.id,
        roles: { some: { role: 'PATIENT' } }
      },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true,
        lastNameMaternal: true,
        dob: true,
        email: true,
        entries: { select: { score: true, comment: true, date: true }, orderBy: { date: 'desc' } }
      }
    })

    if (!patient) return res.status(403).json({ error: 'No autorizado a ver este paciente.' })
    return res.status(200).json(patient)
  }
)
