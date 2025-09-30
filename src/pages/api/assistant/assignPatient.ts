import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/utils/withRole'
import { getSessionUser } from '@/utils/auth-server'

export default withRole(['ASSISTANT'], async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  const me = await getSessionUser(req, res)
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' })

  const { patientId, psychologistId } = (req.body || {}) as { patientId?: string; psychologistId?: string }
  if (!patientId || !psychologistId) return res.status(400).json({ ok: false, error: 'patientId y psychologistId son requeridos' })

  try {
    // resolver organización
    let orgId = me.organizationId as string | null
    if (!orgId && (me as any).assignedPsychologistId) {
      const sponsor = await prisma.user.findUnique({ where: { id: (me as any).assignedPsychologistId }, select: { organizationId: true } })
      orgId = sponsor?.organizationId || null
    }
    if (!orgId) return res.status(400).json({ ok: false, error: 'No se pudo resolver organización' })

    // validar psicólogo destino
    const target = await prisma.user.findFirst({
      where: { id: psychologistId, organizationId: orgId, status: 'ACTIVE', roles: { some: { role: 'PSYCHOLOGIST' } } },
      select: { id: true }
    })
    if (!target) return res.status(403).json({ ok: false, error: 'No puedes asignar a ese psicólogo' })

    // validar paciente
    const patient = await prisma.user.findFirst({
      where: { id: patientId, organizationId: orgId, status: 'ACTIVE', roles: { some: { role: 'PATIENT' } } },
      select: { id: true }
    })
    if (!patient) return res.status(404).json({ ok: false, error: 'Paciente no encontrado' })

    // bandera en user
    await prisma.user.update({ where: { id: patientId }, data: { assignedPsychologistId: psychologistId } })

    // assignment (findFirst → update/create)
    const existing = await prisma.patientAssignment.findFirst({ where: { patientId } })
    if (existing) {
      await prisma.patientAssignment.update({
        where: { id: existing.id },
        data: { psychologistId, organizationId: orgId, status: 'ACTIVE', endedAt: null }
      })
    } else {
      await prisma.patientAssignment.create({
        data: { organizationId: orgId, patientId, psychologistId, status: 'ACTIVE', startedAt: new Date() }
      })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('assistant/assignPatient error:', e)
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})
