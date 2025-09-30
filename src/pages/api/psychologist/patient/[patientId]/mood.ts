// pages/api/psychologist/patient/[patientId]/mood.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET'], ['PSYCHOLOGIST'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const raw = req.query.patientId
    const patientId = Array.isArray(raw) ? raw[0] : raw
    if (!patientId) return res.status(400).json({ ok: false, error: 'MISSING_PATIENT_ID' })

    // Mi usuario (para conocer organización)
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true }
    })
    if (!me) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' })
    if (!me.organizationId) return res.status(400).json({ ok: false, error: 'NO_ORG' })

    // Verificar vínculo activo en mi organización
    const assignment = await prisma.patientAssignment.findFirst({
      where: { organizationId: me.organizationId, psychologistId: me.id, patientId, status: 'ACTIVE' },
      select: { id: true }
    })
    if (!assignment) return res.status(403).json({ ok: false, error: 'NOT_YOUR_PATIENT' })

    const days = Math.max(1, Math.min(365, Number(req.query.days ?? 365)))
    const since = new Date(); since.setDate(since.getDate() - days)

    // Entradas de ánimo del paciente
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: {
        id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true, rut: true,
        moodEntries: {
          where: { date: { gte: since } },
          orderBy: { date: 'desc' },
          select: { id: true, date: true, score: true, comment: true },
        },
      },
    })
    if (!patient) return res.status(404).json({ ok: false, error: 'PATIENT_NOT_FOUND' })

    const items = patient.moodEntries

    // Cálculos rápidos
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999)
    const today = items.find(e => {
      const d = new Date(e.date); return d >= todayStart && d <= todayEnd
    })
    const last7 = items.filter(e => (Date.now() - +new Date(e.date)) <= 7*24*3600*1000)
    const avgWeek = last7.length ? +(last7.reduce((a,b)=>a+b.score,0)/last7.length).toFixed(1) : 0

    return res.json({
      ok: true,
      data: {
        patient: {
          id: patient.id,
          firstName: patient.firstName,
          lastNamePaternal: patient.lastNamePaternal,
          lastNameMaternal: patient.lastNameMaternal,
          rut: patient.rut,
        },
        items,
        avgWeek,
        today: today?.score ?? null,
      },
    })
  }
)
