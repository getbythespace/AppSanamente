import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/utils/withRole'
import { getSessionUser } from '@/utils/auth-server'

export default withRole(['PSYCHOLOGIST', 'ASSISTANT'], async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  const me = await getSessionUser(req, res)
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' })

  const { patientId } = (req.body || {}) as { patientId?: string }
  if (!patientId) return res.status(400).json({ ok: false, error: 'patientId requerido' })

  try {
    // Resolver organización
    let orgId = me.organizationId as string | null
    if (!orgId && (me as any).assignedPsychologistId) {
      const sponsor = await prisma.user.findUnique({
        where: { id: (me as any).assignedPsychologistId },
        select: { organizationId: true }
      })
      orgId = sponsor?.organizationId || null
    }
    if (!orgId) return res.status(400).json({ ok: false, error: 'No se pudo resolver organización' })

    // Paciente dentro del ámbito
    const patient = await prisma.user.findFirst({
      where: { id: patientId, organizationId: orgId, roles: { some: { role: 'PATIENT' } }, status: 'ACTIVE' },
      select: { id: true, assignedPsychologistId: true }
    })
    if (!patient) return res.status(404).json({ ok: false, error: 'Paciente no encontrado' })
    if (!patient.assignedPsychologistId) return res.status(400).json({ ok: false, error: 'El paciente ya está desasignado' })

    // Quitar bandera en User
    await prisma.user.update({ where: { id: patientId }, data: { assignedPsychologistId: null } })

    // Cerrar assignment si existe → findFirst + update por id
    const existing = await prisma.patientAssignment.findFirst({ where: { patientId } })
    if (existing) {
      await prisma.patientAssignment.update({
        where: { id: existing.id },
        data: { status: 'ENDED', endedAt: new Date() }
      })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('psychologist/unassignPatient error:', e)
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})
