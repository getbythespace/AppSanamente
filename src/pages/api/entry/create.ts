import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireRole } from '../../../utils/requireRole'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const user = await requireRole(req, ['PATIENT'])

    // Verificacion de entrada una al día
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const exists = await prisma.entry.findFirst({
      where: {
        patientId: user.id,
        date: { gte: today }
      }
    })
    if (exists) return res.status(400).json({ error: 'Ya registraste tu estado de ánimo hoy.' })

    const { score, comment } = req.body
    const entry = await prisma.entry.create({
      data: {
        patientId: user.id,
        score,
        comment,
        date: new Date()
      }
    })
    res.status(201).json(entry)
  } catch (err: any) {
    res.status(401).json({ error: err.message })
  }
}