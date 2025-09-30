import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'

export default withApi(['GET'], ['PATIENT'],
  async (_req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true, rut: true,
        status: true, isPsychologist: true
      }
    })
    if (!me) return res.status(404).json({ ok: false, error: 'NOT_FOUND' })
    return res.json({ ok: true, data: me })
  }
)
