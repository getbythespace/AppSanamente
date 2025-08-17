import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET'], ['SUPERADMIN'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma }) => {
    const { status = 'PENDING', limit = '50', offset = '0' } = req.query
    const list = await prisma.planChangeRequest.findMany({
      where: { status: String(status).toUpperCase() as any },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        organization: { select: { id: true, name: true, plan: true } },
        requestedBy: { select: { id: true, email: true } },
      }
    })
    res.json({ ok: true, data: list })
  }
)
