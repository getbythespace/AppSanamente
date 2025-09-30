import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/services/supabaseAdmin'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Sin token' })

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Token inválido' })
    const userId = userData.user.id

    const { newEmail } = req.body as { newEmail?: string }
    if (!newEmail) return res.status(400).json({ error: 'newEmail requerido' })

    // Cambia el email sin verificación (admin)
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true,
    })
    if (updErr) return res.status(400).json({ error: updErr.message })

    // Mantener Prisma en sync (si guardas el email allí)
    try {
      await prisma.user.update({ where: { id: userId }, data: { email: newEmail } })
    } catch (_) {}

    return res.status(200).json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Error interno' })
  }
}
