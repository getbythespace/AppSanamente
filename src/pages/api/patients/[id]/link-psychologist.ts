import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/pages/api/_utils/auth'
import { RoleType } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })
  const { id: patientId } = req.query as { id: string }

  const authUser = await requireUser(req, res)
  if (!authUser) return

  const me = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, organizationId: true, roles: { select: { role: true } } },
  })
  if (!me) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' })
  if (!me.organizationId) return res.status(400).json({ ok: false, error: 'No organization' })

  const roles = me.roles as Array<{ role: RoleType }>
  const { mode, psychologistId } = req.body as { mode: 'claim' | 'assign'; psychologistId?: string }

  // validar paciente dentro de mi org
  const patient = await prisma.user.findFirst({
    where: {
      id: patientId,
      organizationId: me.organizationId,
      status: 'ACTIVE',
      roles: { some: { role: RoleType.PATIENT } },
    },
    select: { id: true },
  })
  if (!patient) return res.status(404).json({ ok: false, error: 'Paciente no encontrado' })

  const existing = await prisma.patientAssignment.findFirst({
    where: { organizationId: me.organizationId, patientId, status: 'ACTIVE' },
  })
  if (existing) return res.status(409).json({ ok: false, error: 'Paciente ya vinculado' })

  if (mode === 'claim') {
    const isPsy = roles.some(r => r.role === RoleType.PSYCHOLOGIST)
    if (!isPsy) return res.status(403).json({ ok: false, error: 'Solo psicólogos pueden auto-vincularse' })

    await prisma.patientAssignment.create({
      data: { organizationId: me.organizationId, patientId, psychologistId: me.id, status: 'ACTIVE' },
    })
    return res.json({ ok: true })
  }

  if (mode === 'assign') {
    const isAssistant = roles.some(r => r.role === RoleType.ASSISTANT)
    const isPsy = roles.some(r => r.role === RoleType.PSYCHOLOGIST)
    if (!isAssistant && !isPsy) return res.status(403).json({ ok: false, error: 'Forbidden' })
    if (!psychologistId) return res.status(400).json({ ok: false, error: 'psychologistId requerido' })

    const psy = await prisma.user.findFirst({
      where: {
        id: psychologistId,
        organizationId: me.organizationId,
        status: 'ACTIVE',
        roles: { some: { role: RoleType.PSYCHOLOGIST } },
      },
      select: { id: true },
    })
    if (!psy) return res.status(404).json({ ok: false, error: 'Psicólogo destino inválido' })

    await prisma.patientAssignment.create({
      data: { organizationId: me.organizationId, patientId, psychologistId, status: 'ACTIVE' },
    })
    return res.json({ ok: true })
  }

  return res.status(400).json({ ok: false, error: 'mode inválido' })
}
