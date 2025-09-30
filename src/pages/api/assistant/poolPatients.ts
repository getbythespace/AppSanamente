import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/utils/withRole'
import { getSessionUser } from '@/utils/auth-server'

export default withRole(['ASSISTANT'], async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  const me = await getSessionUser(req, res)
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' })

  try {
    // ámbito
    const where: any = {
      status: 'ACTIVE',
      roles: { some: { role: 'PATIENT' } }
    }

    if (me.organizationId) {
      where.organizationId = me.organizationId
    } else if ((me as any).assignedPsychologistId) {
      // asistente independiente → ver pacientes del sponsor
      where.assignedPsychologistId = (me as any).assignedPsychologistId
    } else {
      return res.status(400).json({ ok: false, error: 'El asistente no tiene ámbito válido' })
    }

    const patients = await prisma.user.findMany({
      where,
      orderBy: [{ lastNamePaternal: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastNamePaternal: true,
        lastNameMaternal: true,
        rut: true,
        createdAt: true,
        assignedPsychologistId: true,
        psychologist: { select: { id: true, firstName: true, lastNamePaternal: true } },
      },
    })

    const data = patients.map(p => ({
      id: p.id,
      firstName: p.firstName,
      lastNamePaternal: p.lastNamePaternal,
      lastNameMaternal: p.lastNameMaternal || '',
      email: p.email,
      rut: p.rut,
      createdAt: p.createdAt,
      isAssigned: !!p.assignedPsychologistId,
      assignedTo: p.psychologist
        ? { id: p.psychologist.id, name: `${p.psychologist.firstName} ${p.psychologist.lastNamePaternal}` }
        : null
    }))

    return res.status(200).json({ ok: true, data })
  } catch (e) {
    console.error('assistant/poolPatients error:', e)
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})
