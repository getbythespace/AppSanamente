import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET'], ['SUPERADMIN'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma }) => {
    const { limit = '50', offset = '0', action, userId, from, to } = req.query

    const where: any = {}
    if (action) where.action = action
    if (userId) where.userId = userId
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from as string) } : {}),
        ...(to ? { lte: new Date(to as string) } : {}),
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })

    return res.status(200).json(logs)
  }
)
