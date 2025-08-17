
import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'
import { canRequestUpgrade, canChangeToPlan } from '@/utils/permissions'

export default withApi(['POST'], ['OWNER'] as AppRole[],
  async (_req: NextApiRequest, res: NextApiResponse, { prisma, userId, roles }) => {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true }
    })
    if (!me?.organizationId) return res.status(400).json({ error: 'Sin organización' })

    const org = await prisma.organization.findUnique({
      where: { id: me.organizationId },
      select: { id: true, plan: true }
    })
    if (!org) return res.status(404).json({ error: 'Organización no encontrada' })

    if (!canRequestUpgrade({ id: me.id, organizationId: me.organizationId, organization: org, roles: roles as any })) {
      return res.status(403).json({ error: 'No autorizado para solicitar upgrade.' })
    }

    const toPlan = 'TEAM' as const
    if (!canChangeToPlan(toPlan)) return res.status(400).json({ error: 'Plan destino inválido.' })

    const pending = await prisma.planChangeRequest.findFirst({
      where: { organizationId: org.id, status: 'PENDING' as any }
    })
    if (pending) return res.status(409).json({ error: 'Ya existe una solicitud pendiente.' })

    const reqRecord = await prisma.planChangeRequest.create({
      data: {
        organizationId: org.id,
        requestedById: me.id,
        fromPlan: org.plan,
        toPlan
      },
      select: { id: true }
    })

    await prisma.auditLog.create({
      data: {
        userId: me.id,
        action: 'REQUEST_PLAN_UPGRADE',
        targetId: org.id,
        description: `Upgrade solicitado: ${org.plan} -> ${toPlan}`
      }
    }).catch(() => {})

    return res.status(201).json({ ok: true, requestId: reqRecord.id })
  }
)
