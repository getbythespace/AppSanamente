import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['POST'], ['PSYCHOLOGIST'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const { patientId } = req.query as { patientId?: string }
    const { content } = req.body as { content?: string }
    if (!patientId || !content?.trim()) return res.status(400).json({ error: 'VALIDATION' })

    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: { assignedPsychologistId: true }
    })
    if (!patient) return res.status(404).json({ error: 'PATIENT_NOT_FOUND' })
    if (patient.assignedPsychologistId !== userId) return res.status(403).json({ error: 'NOT_YOUR_PATIENT' })

    const assignment = await prisma.patientAssignment.findFirst({
      where: { patientId, psychologistId: userId, status: 'ACTIVE' },
      select: { id: true }
    })
    if (!assignment) return res.status(400).json({ error: 'NO_ACTIVE_ASSIGNMENT' })

    const entry = await prisma.clinicalEntry.create({
      data: { assignmentId: assignment.id, authorId: userId, content: content.trim() },
      select: {
        id: true, content: true, createdAt: true,
        authorId: true,
        author: { select: { firstName: true, lastNamePaternal: true } }
      }
    })

    return res.status(201).json(entry)
  }
)
