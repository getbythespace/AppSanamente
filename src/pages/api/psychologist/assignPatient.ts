// src/pages/api/psychologist/assignPatient.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['POST'], ['PSYCHOLOGIST', 'ASSISTANT'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId, roles }) => {
    const { patientId, psychologistId } = req.body as {
      patientId?: string; psychologistId?: string
    }
    if (!patientId) return res.status(400).json({ ok: false, error: 'Falta patientId' })

    // Validar paciente
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, organizationId: true, assignedPsychologistId: true }
    })
    if (!patient) return res.status(404).json({ ok: false, error: 'Paciente no encontrado' })
    if (patient.assignedPsychologistId) {
      return res.status(409).json({ ok: false, error: 'YA_ASIGNADO' })
    }

    // Determinar psicólogo destino
    let targetPsyId = userId // por defecto, el propio (para PSYCHOLOGIST)
    if (roles.includes('ASSISTANT')) {
      if (!psychologistId) {
        return res.status(400).json({ ok: false, error: 'Assistant debe enviar psychologistId' })
      }
      targetPsyId = psychologistId
    }

    // Verificar que el psicólogo existe
    const psy = await prisma.user.findUnique({
      where: { id: targetPsyId },
      select: { id: true, organizationId: true }
    })
    if (!psy) return res.status(404).json({ ok: false, error: 'Psicólogo no encontrado' })

    // Actualizar asignación rápida + crear registro histórico
    await prisma.$transaction([
      prisma.user.update({
        where: { id: patient.id },
        data: { assignedPsychologistId: targetPsyId }
      }),
      prisma.patientAssignment.create({
        data: {
          organizationId: patient.organizationId ?? psy.organizationId ?? '',
          patientId: patient.id,
          psychologistId: targetPsyId,
          status: 'ACTIVE'
        }
      })
    ])

    return res.json({ ok: true })
  }
)
