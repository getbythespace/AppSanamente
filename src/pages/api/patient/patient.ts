import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const pad = (n: number) => String(n).padStart(2, '0')
function parseHHMM(s: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(s)
  if (!m) return null
  const h = Number(m[1]), mi = Number(m[2])
  return (h >= 0 && h <= 23 && mi >= 0 && mi <= 59) ? { hour: h, minute: mi } : null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined
  if (!token) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })

  const { data: su, error } = await supabase.auth.getUser(token)
  if (error || !su?.user?.id) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
  const userId = su.user.id

  if (req.method === 'GET') {
    // ✅ Modelo correcto: PatientReminder -> prisma.patientReminder
    const r = await prisma.patientReminder.findUnique({
      where: { userId },
      select: { hour: true, minute: true, enabled: true },
    })

    if (!r) {
      return res.status(200).json({ ok: true, data: { enabled: false, time: '21:00' } })
    }

    return res.status(200).json({
      ok: true,
      data: { enabled: r.enabled, time: `${pad(r.hour)}:${pad(r.minute)}` },
    })
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    // Por defecto lo dejamos encendido si no viene el flag
    const enabled: boolean = (body.enabled ?? true) as boolean
    const t = parseHHMM((body.time as string) ?? '21:00')
    if (!t) return res.status(400).json({ ok: false, error: 'Hora inválida (HH:mm)' })

    const saved = await prisma.patientReminder.upsert({
      where: { userId },
      update: { enabled, hour: t.hour, minute: t.minute },
      create: { userId, enabled, hour: t.hour, minute: t.minute },
    })

    return res.status(200).json({
      ok: true,
      data: { enabled: saved.enabled, time: `${pad(saved.hour)}:${pad(saved.minute)}` },
    })
  }

  return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
}
