import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['DELETE'], ['SUPERADMIN'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const { id, motivo } = req.body as { id?: string; motivo?: string }
    if (!id || !motivo) return res.status(400).json({ error: 'ID y motivo requeridos' })

    const target = await prisma.user.findUnique({ where: { id }, include: { roles: true } })
    if (target?.roles.some(r => r.role === 'SUPERADMIN')) {
      return res.status(403).json({ error: 'No puedes borrar a otro superadmin' })
    }

    if (target?.roles.some(r => r.role === 'ADMIN') && target.organizationId) {
      const adminsCount = await prisma.userRole.count({
        where: {
          role: 'ADMIN',
          user: { organizationId: target.organizationId, status: 'ACTIVE', id: { not: target.id } }
        }
      })
      if (adminsCount === 0) {
        return res.status(403).json({ error: 'No puedes borrar al único admin de la organización.' })
      }
    }

    await prisma.user.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE_USER',
        targetId: id,
        description: motivo,
      }
    })

    return res.status(200).json({ ok: true })
  }
)
