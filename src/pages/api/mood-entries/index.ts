import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'
import { z } from 'zod'

const postSchema = z.object({
  score: z.number().int().min(1).max(10),
  comment: z.string().trim().max(500).optional(),
})

type MoodItem = { id: string; date: Date; score: number }

export default withApi(['GET', 'POST'], ['PATIENT'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    
    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return res.status(403).json({ ok: false, error: 'NOT_PATIENT' })

    if (req.method === 'GET') {
      const days = Number((req.query.days as string) ?? '7')
      const since = new Date()
      since.setDate(since.getDate() - days)

      const items: MoodItem[] = await prisma.entry.findMany({
        where: { patientId: me.id, date: { gte: since } },
        orderBy: { date: 'asc' },
        select: { id: true, date: true, score: true }
      })

      const avgWeek = items.length
        ? Number((items.reduce((acc, it) => acc + it.score, 0) / items.length).toFixed(1))
        : 0

      const start = new Date(); start.setHours(0, 0, 0, 0)
      const end = new Date();   end.setHours(23, 59, 59, 999)
      const todayScore = items.find(it => it.date >= start && it.date <= end)?.score ?? null

      return res.json({ ok: true, data: { items, avgWeek, today: todayScore } })
    }

    // POST: crea o actualiza la entrada del día
    const parsed = postSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'VALIDATION', issues: parsed.error.issues })
    }

    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end = new Date();   end.setHours(23, 59, 59, 999)

    const existing = await prisma.entry.findFirst({
      where: { patientId: me.id, date: { gte: start, lte: end } }
    })

    const entry = existing
      ? await prisma.entry.update({ where: { id: existing.id }, data: parsed.data })
      : await prisma.entry.create({ data: { patientId: me.id, ...parsed.data } })

    return res.status(existing ? 200 : 201).json({ ok: true, data: entry })
  }
)
