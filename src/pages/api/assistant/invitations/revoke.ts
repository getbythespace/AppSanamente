// src/pages/api/assistant/invitations/revoke.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { withRole } from '@/utils/withRole'
import { getSessionUser } from '@/utils/auth-server'
import { prisma } from '@/lib/prisma'

export default withRole(['ASSISTANT'], async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ ok: false, error: 'No autenticado' })

  const { userId } = (req.body || {}) as { userId?: string }
  if (!userId) return res.status(400).json({ ok: false, error: 'userId requerido' })

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, organizationId: true, assignedPsychologistId: true, roles: true }
    })
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' })

    // Solo pacientes pendientes
    const isPatient = user.roles.some((r: any) => r.role === 'PATIENT')
    if (user.status !== 'PENDING' || !isPatient) {
      return res.status(400).json({ ok: false, error: 'Solo se pueden revocar pacientes pendientes' })
    }

    // Chequear ámbito
    const sameOrg = !!sessionUser.organizationId && sessionUser.organizationId === user.organizationId
    const samePsy = !sessionUser.organizationId &&
      'assignedPsychologistId' in sessionUser &&
      (sessionUser as any).assignedPsychologistId &&
      (sessionUser as any).assignedPsychologistId === user.assignedPsychologistId

    if (!sameOrg && !samePsy) {
      return res.status(403).json({ ok: false, error: 'No autorizado para revocar esta invitación' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'DELETED' }
    })

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('assistant/invitations/revoke error:', e)
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})
