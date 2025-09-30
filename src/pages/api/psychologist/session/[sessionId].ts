import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/pages/api/_utils/auth'
import { isAfter } from 'date-fns'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' })
  const auth = await requireUser(req, res); if (!auth) return

  const sessionId = String(req.query.sessionId || req.query.id || '')
  const note = (req.body?.note || '').trim()
  if (!sessionId || !note) return res.status(400).json({ ok: false, error: 'BAD_REQUEST' })

  const s = await prisma.sessionNote.findUnique({
    where: { id: sessionId },
    select: { id: true, psychologistId: true, editableUntil: true }
  })
  if (!s || s.psychologistId !== auth.id) return res.status(403).json({ ok: false, error: 'FORBIDDEN' })
  if (!s.editableUntil || !isAfter(s.editableUntil, new Date()))
    return res.status(403).json({ ok: false, error: 'LOCKED' })

  const updated = await prisma.sessionNote.update({
    where: { id: sessionId },
    data: { note },
    select: { id: true, note: true, date: true, editableUntil: true }
  })

  return res.json({ ok: true, ...updated, canEdit: true })
}
