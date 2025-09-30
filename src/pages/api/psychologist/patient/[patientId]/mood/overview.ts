import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/pages/api/_utils/auth'
import { RoleType } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' })

  const auth = await requireUser(req, res)
  if (!auth) return

  const me = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { id: true, organizationId: true, roles: { select: { role: true } } },
  })
  if (!me) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' })
  const isPsy = me.roles.some(r => r.role === RoleType.PSYCHOLOGIST)
  if (!isPsy) return res.status(403).json({ ok: false, error: 'FORBIDDEN' })
  if (!me.organizationId) return res.status(400).json({ ok: false, error: 'NO_ORG' })

  const rawId = req.query.patientId
  const patientId = Array.isArray(rawId) ? rawId[0] : rawId
  if (!patientId) return res.status(400).json({ ok: false, error: 'MISSING_PATIENT_ID' })

  const assignment = await prisma.patientAssignment.findFirst({
    where: { organizationId: me.organizationId, psychologistId: me.id, patientId, status: 'ACTIVE' },
    select: { id: true, startedAt: true },
  })
  if (!assignment) return res.status(403).json({ ok: false, error: 'NOT_YOUR_PATIENT' })

  const since = new Date(); since.setDate(since.getDate() - 30)

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: {
      id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true, rut: true, dob: true,
      moodEntries: {
        where: { date: { gte: since } },
        orderBy: { date: 'desc' },
        select: { date: true, score: true, comment: true },
      },
    },
  })
  if (!patient) return res.status(404).json({ ok: false, error: 'PATIENT_NOT_FOUND' })

  const scores = patient.moodEntries.map(e => e.score)
  const avg30 = scores.length ? +(scores.reduce((a,b)=>a+b,0) / scores.length).toFixed(1) : null
  const lastEntryAt = patient.moodEntries[0]?.date ?? null

  return res.json({
    ok: true,
    data: {
      patient: {
        id: patient.id,
        name: `${patient.firstName} ${patient.lastNamePaternal}${patient.lastNameMaternal ? ' '+patient.lastNameMaternal : ''}`,
        rut: patient.rut,
        dob: patient.dob,
      },
      assignment,
      avg30,
      lastEntryAt,
      last30: patient.moodEntries,
    },
  })
}
