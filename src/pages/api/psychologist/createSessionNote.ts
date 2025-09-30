import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

function startEndOfDay(d = new Date()) {
  const s = new Date(d); s.setHours(0,0,0,0)
  const e = new Date(d); e.setHours(23,59,59,999)
  return { s, e }
}

export default withApi(['POST'], ['PSYCHOLOGIST'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const { patientId, note, date } = (req.body ?? {}) as {
      patientId?: string
      note?: string
      date?: string
    }

    if (!patientId || !note?.trim()) {
      return res.status(400).json({ ok: false, error: 'VALIDATION' })
    }

    // Debe ser mi paciente
    const patient = await prisma.user.findFirst({
      where: { id: patientId, assignedPsychologistId: userId, roles: { some: { role: 'PATIENT' } } },
      select: { id: true }
    })
    if (!patient) return res.status(403).json({ ok: false, error: 'NOT_YOUR_PATIENT' })

    // Asignación activa (para ligar la nota)
    const assignment = await prisma.patientAssignment.findFirst({
      where: { patientId, psychologistId: userId, status: 'ACTIVE' },
      select: { id: true }
    })

    // 1 sesión por día/paciente/psicólogo
    const when = date ? new Date(date) : new Date()
    const { s, e } = startEndOfDay(when)
    const existing = await prisma.sessionNote.findFirst({
      where: { patientId, psychologistId: userId, date: { gte: s, lte: e } },
      select: { id: true }
    })
    if (existing) {
      return res.status(409).json({ ok: false, error: 'ALREADY_EXISTS_TODAY' })
    }

    const createdAt = new Date()
    const editableUntil = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)

    const created = await prisma.sessionNote.create({
      data: {
        psychologistId: userId,
        patientId,
        note: note.trim(),
        date: when,
        editableUntil,
        assignmentId: assignment?.id ?? null
      }
    })

    return res.status(201).json({ ok: true, data: created })
  }
)
