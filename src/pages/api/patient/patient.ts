import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET','POST'], ['PATIENT','PSYCHOLOGIST','ASSISTANT'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId, roles }) => {
    const idFromQuery = req.query.id as string | undefined
    const idFromBody  = (req.body?.patientId as string | undefined)
    const patientId = idFromQuery || idFromBody
    if (!patientId) return res.status(400).json({ error: 'Id requerido' })

    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return res.status(401).json({ error: 'UNAUTHORIZED' })

    // Reglas de acceso
    if (roles.includes('PATIENT') && me.id !== patientId) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (roles.includes('PSYCHOLOGIST')) {
      const patient = await prisma.user.findUnique({ where: { id: patientId } })
      if (!patient || patient.assignedPsychologistId !== me.id) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }
    if (roles.includes('ASSISTANT')) {
      const patient = await prisma.user.findUnique({ where: { id: patientId } })
      if (!patient || patient.organizationId !== me.organizationId) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    if (req.method === 'POST') {
      const { score, comment } = req.body as { score: number; comment?: string }
      const entry = await prisma.entry.create({ data: { patientId, score, comment } })
      return res.status(201).json(entry)
    }

    // GET
    const entries = await prisma.entry.findMany({
      where: { patientId },
      orderBy: { date: 'desc' },
    })
    return res.status(200).json(entries)
  }
)
