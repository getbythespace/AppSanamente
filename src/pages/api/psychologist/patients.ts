import type { NextApiRequest, NextApiResponse } from 'next'
import { requireRole } from '../../../utils/requireRole'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await requireRole(req, ['PSYCHOLOGIST'])
    const patients = await prisma.user.findMany({
      where: { assignedPsychologistId: user.id, roles: { some: { role: 'PATIENT' } } }
    })
    res.json(patients)
  } catch (err: any) {
    res.status(403).json({ error: err.message })
  }
}