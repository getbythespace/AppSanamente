import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/pages/api/_utils/auth'
import { RoleType } from '@prisma/client'
import { addHours, startOfDay, endOfDay, isAfter } from 'date-fns'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' })

  const auth = await requireUser(req, res); if (!auth) return
  const me = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { id: true, roles: { select: { role: true } } }
  })
  if (!me || !me.roles.some(r => r.role === RoleType.PSYCHOLOGIST))
    return res.status(403).json({ ok: false, error: 'FORBIDDEN' })

  const patientId = String(req.query.patientId || '')
  if (!patientId) return res.status(400).json({ ok: false, error: 'MISSING_PATIENT_ID' })

  const assignment = await prisma.patientAssignment.findFirst({
    where: { patientId, psychologistId: me.id, status: 'ACTIVE' },
    select: { id: true }
  })
  if (!assignment) return res.status(403).json({ ok: false, error: 'NOT_ASSIGNED' })

  const note = (req.body?.note || '').trim()
  if (!note) return res.status(400).json({ ok: false, error: 'NOTE_REQUIRED' })

  const today = new Date()
  const existing = await prisma.sessionNote.findFirst({
    where: {
      assignmentId: assignment.id,
      date: { gte: startOfDay(today), lte: endOfDay(today) }
    }
  })

  if (existing) {
    const stillEditable = existing.editableUntil ? isAfter(existing.editableUntil, new Date()) : false
    if (stillEditable) return res.status(409).json({ ok: false, error: 'SESSION_EXISTS_TODAY', sessionId: existing.id })
    return res.status(403).json({ ok: false, error: 'SESSION_LOCKED' })
  }

  const created = await prisma.sessionNote.create({
    data: {
      assignmentId: assignment.id,
      patientId,
      psychologistId: me.id,
      note,
      date: today,
      editableUntil: addHours(today, 24)
    },
    select: { id: true, note: true, date: true, editableUntil: true }
  })

  return res.status(201).json({ ok: true, ...created, canEdit: true })
}
