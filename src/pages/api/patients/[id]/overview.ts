import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET'], ['PSYCHOLOGIST','ADMIN','SUPERADMIN'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId, roles }) => {
    const patientId = req.query.id as string

    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return res.status(401).json({ ok:false, error:'UNAUTHORIZED' })

    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: {
        id: true, firstName: true, lastNamePaternal: true,
        organizationId: true, assignedPsychologistId: true,
        entries: { orderBy: { date: 'desc' }, take: 30, select: { id: true, date: true, score: true } },
      }
    })
    if (!patient) return res.status(404).json({ ok:false, error:'PATIENT_NOT_FOUND' })

    const isSuper = roles.includes('SUPERADMIN')
    const isAdmin = roles.includes('ADMIN')
    const isMine = patient.assignedPsychologistId === me.id

    if (!isSuper) {
      if (roles.includes('PSYCHOLOGIST') && !isMine) {
        return res.status(403).json({ ok:false, error:'NOT_YOUR_PATIENT' })
      }
      if (isAdmin && patient.organizationId !== me.organizationId) {
        return res.status(403).json({ ok:false, error:'DIFFERENT_ORG' })
      }
    }

    const entriesAsc = [...patient.entries].reverse()
    const last7 = entriesAsc.slice(-7)
    const avg7 = last7.length
      ? Number((last7.reduce((a, b) => a + b.score, 0) / Math.min(7, entriesAsc.length)).toFixed(1))
      : 0
    const last = entriesAsc.at(-1)?.score ?? null

    const activeDx = await prisma.diagnosis.findFirst({
      where: { patientId: patient.id, archived: false },
      select: { id: true, text: true, updatedAt: true }
    })

    const notes = await prisma.sessionNote.findMany({
      where: { patientId, psychologistId: me.id },
      orderBy: { date: 'desc' },
      take: 10,
      select: { id: true, note: true, date: true }
    })

    return res.json({
      ok: true,
      data: {
        patient: { id: patient.id, name: `${patient.firstName} ${patient.lastNamePaternal}` },
        metrics: { avg7, last },
        entries: entriesAsc,
        diagnosis: activeDx ?? null,
        notes
      }
    })
  }
)
