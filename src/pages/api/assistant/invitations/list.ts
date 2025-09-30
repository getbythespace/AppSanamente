// src/pages/api/assistant/invitations/list.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { withRole } from '@/utils/withRole'
import { getSessionUser } from '@/utils/auth-server'
import { prisma } from '@/lib/prisma'

export default withRole(['ASSISTANT'], async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ ok: false, error: 'No autenticado' })

  try {
    const baseWhere: any = {
      status: 'PENDING',
      roles: { some: { role: 'PATIENT' } }
    }

    if (sessionUser.organizationId) {
      baseWhere.organizationId = sessionUser.organizationId
    } else if ('assignedPsychologistId' in sessionUser && (sessionUser as any).assignedPsychologistId) {
      // asistente independiente → mostramos los pacientes pendientes que “apuntan” a su psicólogo
      baseWhere.assignedPsychologistId = (sessionUser as any).assignedPsychologistId
    } else {
      return res.status(400).json({ ok: false, error: 'El asistente no tiene organización ni psicólogo vinculado' })
    }

    const pending = await prisma.user.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true,
        rut: true, createdAt: true
      }
    })

    const data = pending.map(p => ({
      id: p.id,
      email: p.email,
      name: `${p.firstName} ${p.lastNamePaternal} ${p.lastNameMaternal || ''}`.trim(),
      rut: p.rut,
      createdAt: p.createdAt
    }))

    return res.status(200).json({ ok: true, data })
  } catch (e) {
    console.error('assistant/invitations/list error:', e)
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})
