import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['DELETE'], ['ADMIN'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return res.status(401).json({ error: 'UNAUTHORIZED' })

    const { id } = req.body as { id?: string }
    if (!id) return res.status(400).json({ error: 'ID requerido' })

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || target.organizationId !== me.organizationId) {
      return res.status(403).json({ error: 'No autorizado para eliminar este usuario.' })
    }
    if (me.id === id) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de admin.' })

    await prisma.user.delete({ where: { id } })
    return res.status(200).json({ ok: true, message: 'Usuario eliminado correctamente.' })
  }
)
