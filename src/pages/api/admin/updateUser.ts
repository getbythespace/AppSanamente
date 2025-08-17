import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['PUT'], ['ADMIN'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return res.status(401).json({ error: 'UNAUTHORIZED' })

    const id = (req.query.id as string) || (req.body?.id as string)
    if (!id) return res.status(400).json({ error: 'Falta el parámetro id' })

    const { firstName, lastNamePaternal, lastNameMaternal, rut, dob } = req.body as any

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || target.organizationId !== me.organizationId) {
      return res.status(403).json({ error: 'No autorizado para editar este usuario.' })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        firstName, lastNamePaternal, lastNameMaternal, rut,
        dob: dob ? new Date(dob) : undefined
      },
      include: { roles: true }
    })

    return res.status(200).json(updatedUser)
  }
)
