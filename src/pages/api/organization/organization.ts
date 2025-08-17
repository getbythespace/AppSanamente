import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET','POST'], ['ADMIN'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return res.status(401).json({ error: 'UNAUTHORIZED' })

    if (req.method === 'GET') {
      if (!me.organizationId) return res.status(404).json({ error: 'No perteneces a ninguna organización.' })
      const org = await prisma.organization.findUnique({ where: { id: me.organizationId } })
      return res.json(org)
    }

    // POST
    const { name, rut } = req.body as { name?: string; rut?: string }
    if (me.organizationId) return res.status(403).json({ error: 'Ya perteneces a una organización.' })
    if (!name || !rut) return res.status(400).json({ error: 'Faltan campos (name, rut).' })

    const org = await prisma.organization.create({ data: { name, rut } })
    return res.status(201).json(org)
  }
)
