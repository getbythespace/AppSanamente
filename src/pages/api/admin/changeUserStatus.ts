import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'
import { z } from 'zod'

const StatusEnum = ['ACTIVE','INACTIVE','PENDING','SUSPENDED','DELETED'] as const
type UserStatus = typeof StatusEnum[number]

const bodySchema = z.object({
  id: z.string().min(10),
  status: z.enum(StatusEnum),
  motivo: z.string().max(300).optional(),
}).refine(d => d.status === 'ACTIVE' || d.status === 'INACTIVE', {
  message: 'Status inválido. Solo puedes inactivar o reactivar.',
})

export default withApi(['PATCH'], ['ADMIN','SUPERADMIN'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId, roles }) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Body inválido', issues: parsed.error.issues })
    const { id, status, motivo } = parsed.data

    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return res.status(401).json({ error: 'UNAUTHORIZED' })

    const target = await prisma.user.findUnique({ where: { id }, include: { roles: true } })
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' })

    const isSuper = roles.includes('SUPERADMIN')
    if (!isSuper && target.organizationId !== me.organizationId) {
      return res.status(403).json({ error: 'No autorizado para modificar este usuario.' })
    }
    if (me.id === id) return res.status(400).json({ error: 'No puedes cambiar tu propio status.' })

    // Si es psicólogo y va a INACTIVE, liberar pacientes
    const isTargetPsy = target.roles.some(r => r.role === 'PSYCHOLOGIST')
    if (isTargetPsy && status === 'INACTIVE') {
      await prisma.user.updateMany({
        where: { assignedPsychologistId: id },
        data: { assignedPsychologistId: null },
      })
    }

    const updatedUser = await prisma.user.update({
      where: { id }, data: { status: status as UserStatus }, select: { id: true, status: true }
    })

    await prisma.auditLog.create({
      data: {
        userId: me.id,
        action: status === 'INACTIVE' ? 'DEACTIVATE_USER' : 'REACTIVATE_USER',
        targetId: id,
        description: motivo || `Status cambiado a ${status}`,
      },
    })

    return res.status(200).json({ ok: true, user: updatedUser })
  }
)
