import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['POST'], ['PSYCHOLOGIST'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const { patientId, note, date } = req.body as { patientId: string; note: string; date?: string }

    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return res.status(401).json({ error: 'UNAUTHORIZED' })

    const patient = await prisma.user.findFirst({
      where: {
        id: patientId,
        assignedPsychologistId: me.id,
        roles: { some: { role: 'PATIENT' } }
      }
    })
    if (!patient) return res.status(403).json({ error: 'No autorizado para este paciente.' })

    const sessionNote = await prisma.sessionNote.create({
      data: {
        psychologistId: me.id,
        patientId,
        note,
        date: date ? new Date(date) : new Date(),
      }
    })

    return res.status(201).json(sessionNote)
  }
)
