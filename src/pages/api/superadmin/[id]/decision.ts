import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'
import { canApprovePlanChange, canChangeToPlan } from '@/utils/permissions'
import { RequestStatus } from '@prisma/client'

export default withApi(['POST'], ['SUPERADMIN'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, roles, userId }) => {
    if (!canApprovePlanChange(roles as any)) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const requestId = req.query.id as string
    const { decision, motivo } = req.body as { decision?: 'APPROVE' | 'REJECT'; motivo?: string }
    if (!requestId || !decision) return res.status(400).json({ error: 'Parámetros inválidos' })

    const request = await prisma.planChangeRequest.findUnique({
      where: { id: requestId },
      include: { organization: true }
    })
    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' })
    if (request.status !== RequestStatus.PENDING) {
      return res.status(409).json({ error: 'Solicitud ya resuelta' })
    }

    if (decision === 'REJECT') {
      await prisma.planChangeRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.DENIED } 
      })

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'PLAN_CHANGE_REJECT',
          targetId: request.organizationId,
          description: motivo || `Solicitud ${requestId} rechazada`
        }
      }).catch(() => {})

      return res.json({ ok: true })
    }

    
    if (!canChangeToPlan(request.toPlan as any)) {
      return res.status(400).json({ error: 'Cambio de plan no permitido (no-downgrade)' })
    }

    await prisma.$transaction([
      prisma.organization.update({
        where: { id: request.organizationId },
        data: { plan: request.toPlan as any }
      }),
      prisma.planChangeRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.APPROVED }
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'PLAN_CHANGE_APPROVE',
          targetId: request.organizationId,
          description: `Plan: ${request.fromPlan} -> ${request.toPlan}`
        }
      })
    ])

    return res.json({ ok: true })
  }
)
