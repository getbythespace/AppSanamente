// src/pages/api/psychologist/poolPatients.ts
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

  try {
    const { userId, organizationId: orgFromAuth } = auth
    console.log('🔍 Cargando pool de pacientes para:', userId)

    // Resolver organización: si no viene en auth y soy "independiente", usar la del sponsor
    let organizationId: string | null = orgFromAuth ?? null

    if (!organizationId) {
      const me = await prisma.user.findUnique({
        where: { id: userId },
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
      return res.status(400).json({
        ok: false,
        error: 'Usuario no tiene organización asignada ni sponsor con organización'
      })
    }

    const allPatients = await prisma.user.findMany({
      where: {
        AND: [
          { organizationId },
          { status: 'ACTIVE' },
          { roles: { some: { role: 'PATIENT' } } }
        ]
      },
      include: {
        psychologist: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
            roles: { select: { role: true } }
          }
        }
      },
      orderBy: [{ assignedPsychologistId: 'asc' }, { firstName: 'asc' }]
    })

    const stats = {
      total: allPatients.length,
      assigned: allPatients.filter(p => p.assignedPsychologistId).length,
      unassigned: allPatients.filter(p => !p.assignedPsychologistId).length
    }

    const patientsWithAssignment = allPatients.map(patient => ({
      id: patient.id,
      firstName: patient.firstName,
      lastNamePaternal: patient.lastNamePaternal,
      lastNameMaternal: patient.lastNameMaternal,
      email: patient.email,
      rut: patient.rut,
      createdAt: patient.createdAt,
      isAssigned: !!patient.assignedPsychologistId,
      assignedTo: patient.psychologist
        ? {
            id: patient.psychologist.id,
            name: `${patient.psychologist.firstName} ${patient.psychologist.lastNamePaternal}`,
            isAdminRole:
              patient.psychologist.roles?.some(r =>
                ['ADMIN', 'OWNER', 'SUPERADMIN'].includes(r.role)
              ) || false
          }
        : null,
      isMyPatient: patient.assignedPsychologistId === userId
    }))

    return res.json({ ok: true, data: patientsWithAssignment, stats })
  } catch (error) {
    console.error('❌ Error fetching pool patients:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return res.status(500).json({ ok: false, error: errorMessage })
  }
}

// ✅ permitir PSYCHOLOGIST y ASSISTANT
export default withRole(['PSYCHOLOGIST', 'ASSISTANT'], handler)
