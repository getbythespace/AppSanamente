import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/pages/api/_utils/auth'
import { RoleType } from '@prisma/client'
import { isAfter } from 'date-fns'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' })

  const auth = await requireUser(req, res); if (!auth) return
  const me = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { id: true, organizationId: true, roles: { select: { role: true } } }
  })
  if (!me) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
  const isPsy = me.roles.some(r => r.role === RoleType.PSYCHOLOGIST)
  if (!isPsy) return res.status(403).json({ ok: false, error: 'FORBIDDEN' })

  const patientId = String((req.query.patientId ?? req.query.patient) || '')
  if (!patientId) return res.status(400).json({ ok: false, error: 'MISSING_PATIENT_ID' })

  const assignment = await prisma.patientAssignment.findFirst({
    where: { patientId, psychologistId: me.id, status: 'ACTIVE' },
    include: { patient: true }
  })
  if (!assignment) return res.status(403).json({ ok: false, error: 'NOT_ASSIGNED' })

  const sessions = await prisma.sessionNote.findMany({
    where: { assignmentId: assignment.id },
    select: { id: true, note: true, date: true, editableUntil: true, createdAt: true, updatedAt: true },
    orderBy: { date: 'desc' }
  })

  const now = new Date()
  const payload = sessions.map(s => ({ ...s, canEdit: s.editableUntil ? isAfter(s.editableUntil, now) : false }))

  return res.json({
    ok: true,
    patient: {
      id: assignment.patient.id,
      firstName: assignment.patient.firstName,
      lastNamePaternal: assignment.patient.lastNamePaternal,
      lastNameMaternal: assignment.patient.lastNameMaternal ?? null,
      rut: assignment.patient.rut ?? null
    },
    sessions: payload
  })
}
