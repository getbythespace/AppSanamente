// src/pages/api/psychologist/listPsychologists.ts
import type { NextApiHandler, NextApiResponse } from 'next'
import withRole, { AuthedRequest } from '@/utils/withRole'
import { prisma } from '@/lib/prisma'

const handler: NextApiHandler = async (req, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  // ⬇️ Tipado: castear req para acceder a req.auth
  const { auth } = req as unknown as AuthedRequest
  if (!auth?.userId) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' })
  }

  // organizationId directo de auth; si falta, resolvemos por sponsor
  let organizationId = auth.organizationId ?? null

  if (!organizationId) {
    const me = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { organizationId: true, assignedPsychologistId: true }
    })
    organizationId = me?.organizationId ?? null

    if (!organizationId && me?.assignedPsychologistId) {
      const sponsor = await prisma.user.findUnique({
        where: { id: me.assignedPsychologistId },
        select: { organizationId: true }
      })
      organizationId = sponsor?.organizationId ?? null
    }
  }

  if (!organizationId) {
    // sin organización ni sponsor: devolver vacío para no romper UI
    return res.json({ ok: true, data: [] })
  }

  const psychologists = await prisma.user.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      roles: { some: { role: 'PSYCHOLOGIST' } },
    },
    select: {
      id: true,
      firstName: true,
      lastNamePaternal: true,
      email: true,
    },
    orderBy: [{ firstName: 'asc' }, { lastNamePaternal: 'asc' }],
  })

  const data = psychologists.map(p => ({
    id: p.id,
    firstName: p.firstName,
    lastNamePaternal: p.lastNamePaternal,
    email: p.email,
  }))

  return res.json({ ok: true, data })
}

// ✅ roles con acceso
export default withRole(['PSYCHOLOGIST', 'ASSISTANT', 'ADMIN', 'OWNER'], handler)
