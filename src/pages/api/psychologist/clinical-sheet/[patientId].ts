import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET'], ['PSYCHOLOGIST'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const { patientId } = req.query as { patientId?: string }
    if (!patientId) return res.status(400).json({ error: 'MISSING_PATIENT_ID' })

    // Debe ser mi paciente (asignación rápida) y tener assignment ACTIVO
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: {
        id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true, rut: true,
        assignedPsychologistId: true
      }
    })
    if (!patient) return res.status(404).json({ error: 'PATIENT_NOT_FOUND' })
    if (patient.assignedPsychologistId !== userId) return res.status(403).json({ error: 'NOT_YOUR_PATIENT' })

    const assignment = await prisma.patientAssignment.findFirst({
      where: { patientId, psychologistId: userId, status: 'ACTIVE' },
      select: { id: true }
    })
    if (!assignment) return res.status(400).json({ error: 'NO_ACTIVE_ASSIGNMENT' })

    const entries = await prisma.clinicalEntry.findMany({
      where: { assignmentId: assignment.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, content: true, createdAt: true,
        authorId: true,
        author: { select: { firstName: true, lastNamePaternal: true } }
      }
    })

    return res.status(200).json({
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastNamePaternal: patient.lastNamePaternal,
        lastNameMaternal: patient.lastNameMaternal,
        rut: patient.rut
      },
      entries
    })
  }
)
