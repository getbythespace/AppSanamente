import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { authenticateAndAuthorize } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' })
  }

  try {
    // 🔒 Auth
    const auth = await authenticateAndAuthorize(req, res, ['ADMIN', 'OWNER', 'SUPERADMIN'])
    if ('error' in auth) return res.status(auth.status).json({ ok: false, error: auth.error })

    const me = auth.user
    if (!me.organizationId) return res.status(400).json({ ok: false, error: 'Sin organización' })
    const orgId = me.organizationId

    // 🚫 Evitar cache / 304
    res.setHeader('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    // ETag cambiante para que el navegador no revalide con 304
    res.setHeader('ETag', `${Date.now()}`)

    // 📦 Plan y límites
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, planLimit: { select: { assistantsMax: true } } }
    })

    const plan = org?.plan ?? 'TEAM'
    const assistantsMax = plan === 'SOLO' ? 1 : (org?.planLimit?.assistantsMax ?? 2)

    // 👥 Asistentes: actuales + pendientes
    const assistantsUsers = await prisma.userRole.count({
      where: {
        role: 'ASSISTANT',
        user: {
          organizationId: orgId,
          status: { in: ['ACTIVE', 'PENDING'] }
        }
      }
    })
    const assistantsPending = await prisma.userInvitation.count({
      where: { organizationId: orgId, role: 'ASSISTANT', status: 'PENDING' }
    })

    // 🧠 Psicólogos: actuales + pendientes
    const psychologistsUsers = await prisma.user.count({
      where: {
        organizationId: orgId,
        OR: [
          { isPsychologist: true },
          { roles: { some: { role: 'PSYCHOLOGIST' } } }
        ]
      }
    })
    const psychologistsPending = await prisma.userInvitation.count({
      where: { organizationId: orgId, role: 'PSYCHOLOGIST', status: 'PENDING' }
    })

    // 🧾 Forma que espera tu frontend (data.counts.*)
    return res.status(200).json({
      ok: true,
      plan,
      counts: {
        assistantsUsers,
        assistantsPending,
        psychologistsUsers,
        psychologistsPending,
        // útil si luego lo quieres mostrar:
        assistantsMax
      }
    })
  } catch (e) {
    console.error('[limits] error', e)
    return res.status(500).json({ ok: false, error: 'Error interno' })
  }
}
