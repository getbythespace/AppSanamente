import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/pages/api/_utils/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' })
  const auth = await requireUser(req, res); if (!auth) return

  const patientId = String(req.query.patientId || req.query.id || '')
  if (!patientId) return res.status(400).json({ ok: false, error: 'MISSING_PATIENT_ID' })

  const assign = await prisma.patientAssignment.findFirst({
    where: { patientId, psychologistId: auth.id, status: 'ACTIVE' },
    include: { patient: true }
  })
  if (!assign) return res.status(403).json({ ok: false, error: 'NOT_ASSIGNED' })

  return res.json({ ok: true, patient: assign.patient })
}
