import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/pages/api/_utils/auth'
import { startOfDay, endOfDay, isAfter } from 'date-fns'

const getParam = (req: NextApiRequest, keys: string[]) => {
  for (const k of keys) {
    const v = (req.query as any)[k]
    if (Array.isArray(v)) return v[0]
    if (typeof v === 'string' && v) return v
  }
  return undefined
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'METHOD_NOT_ALLOWED' })

  const me = await requireUser(req, res)
  if (!me) return

  const patientId = getParam(req, ['patientId','patient','id'])
  if (!patientId) return res.status(400).json({ ok:false, error:'MISSING_PATIENT_ID' })

  const linked = await prisma.patientAssignment.findFirst({
    where: { patientId, psychologistId: me.id, status:'ACTIVE' }, select:{ id:true }
  })
  if (!linked) {
    const fallback = await prisma.user.findFirst({
      where: { id: patientId, assignedPsychologistId: me.id, roles:{ some:{ role:'PATIENT' } } },
      select: { id:true }
    })
    if (!fallback) return res.status(403).json({ ok:false, error:'NOT_YOUR_PATIENT' })
  }

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { id:true, firstName:true, lastNamePaternal:true, lastNameMaternal:true, rut:true }
  })
  if (!patient) return res.status(404).json({ ok:false, error:'PATIENT_NOT_FOUND' })

  const today = new Date()
  const session = await prisma.sessionNote.findFirst({
    where: {
      patientId, psychologistId: me.id,
      date: { gte: startOfDay(today), lte: endOfDay(today) }
    }
  })

  if (!session) return res.json({ ok:true, patient, session: null })

  const canEdit = session.editableUntil ? !isAfter(new Date(), session.editableUntil) : false
  return res.json({ ok:true, patient, session: { ...session, canEdit } })
}
