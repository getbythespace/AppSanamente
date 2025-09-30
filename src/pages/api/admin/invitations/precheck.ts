import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { authenticateAndAuthorize } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' })
  }
  try {
    const auth = await authenticateAndAuthorize(req, res, ['ADMIN','OWNER','SUPERADMIN'])
    if ('error' in auth) return res.status(auth.status).json({ ok:false, error: auth.error })
    const me = auth.user
    if (!me.organizationId) return res.status(400).json({ ok:false, error: 'Usuario sin organización' })

    const org = await prisma.organization.findUnique({
      where: { id: me.organizationId },
      select: { plan: true, planLimit: { select: { assistantsMax: true } } }
    })
    const plan = org?.plan ?? 'TEAM'
    const assistantsLimit = plan === 'SOLO' ? 1 : (org?.planLimit?.assistantsMax ?? 999999)

    const [assistantsUsers, assistantsPending, psychologistsUsers, psychologistsPending] = await Promise.all([
      prisma.userRole.count({ where: { role:'ASSISTANT', user: { organizationId: me.organizationId } } }),
      prisma.invitation.count({ where: { organizationId: me.organizationId, role:'ASSISTANT', status:'PENDING' } }),
      prisma.userRole.count({ where: { role:'PSYCHOLOGIST', user: { organizationId: me.organizationId } } }),
      prisma.invitation.count({ where: { organizationId: me.organizationId, role:'PSYCHOLOGIST', status:'PENDING' } }),
    ])

    const assistantsUsed = assistantsUsers + assistantsPending
    const canInviteAssistant = assistantsUsed < assistantsLimit
    const canInvitePsychologist = plan !== 'SOLO'

    return res.json({
      ok: true,
      data: {
        plan,
        assistants: { used: assistantsUsed, limit: assistantsLimit, canInvite: canInviteAssistant },
        psychologists: { used: psychologistsUsers + psychologistsPending, canInvite: canInvitePsychologist }
      }
    })
  } catch (e) {
    console.error('[INVITE precheck]', e)
    return res.status(500).json({ ok:false, error:'Error interno del servidor' })
  }
}
