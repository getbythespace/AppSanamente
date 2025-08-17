import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['POST'], ['SUPERADMIN'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const { userId: targetId } = req.body as { userId?: string }
    if (!targetId) return res.status(400).json({ error: 'userId requerido' })

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'IMPERSONATE_USER',
        targetId,
        description: 'Impersonación solicitada',
      }
    })

    return res.status(200).json({ ok: true, message: 'Impersonación lista (implementar lógica de token)' })
  }
)
