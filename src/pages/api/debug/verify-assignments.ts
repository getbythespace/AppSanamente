import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/pages/api/_utils/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = await requireUser(req, res)
  if (!authUser) return

  try {
    // Obtener organización del usuario actual
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { organizationId: true }
    })

    if (!currentUser?.organizationId) {
      return res.status(400).json({ ok: false, error: 'Usuario sin organización' })
    }

    // Estadísticas de la organización
    const orgStats = await prisma.user.findMany({
      where: {
        organizationId: currentUser.organizationId,
        status: 'ACTIVE',
        roles: { some: { role: 'PATIENT' } }
      },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true,
        assignedPsychologistId: true,
        psychologist: {
          select: {
            firstName: true,
            lastNamePaternal: true
          }
        }
      }
    })

    // Psicólogos en la organización
    const psychologists = await prisma.user.findMany({
      where: {
        organizationId: currentUser.organizationId,
        status: 'ACTIVE',
        roles: { some: { role: 'PSYCHOLOGIST' } }
      },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true,
        roles: { select: { role: true } }
      }
    })

    // Análisis de distribución
    const distribution = psychologists.map(psy => ({
      psychologist: `${psy.firstName} ${psy.lastNamePaternal}`,
      roles: psy.roles.map(r => r.role),
      assignedPatientsCount: orgStats.filter(p => p.assignedPsychologistId === psy.id).length,
      isAdminRole: psy.roles.some(r => ['ADMIN', 'OWNER', 'SUPERADMIN'].includes(r.role))
    }))

    const summary = {
      totalPatients: orgStats.length,
      assignedPatients: orgStats.filter(p => p.assignedPsychologistId).length,
      unassignedPatients: orgStats.filter(p => !p.assignedPsychologistId).length,
      totalPsychologists: psychologists.length,
      purePsychologists: psychologists.filter(p => 
        !p.roles.some(r => ['ADMIN', 'OWNER', 'SUPERADMIN'].includes(r.role))
      ).length
    }

    return res.json({
      ok: true,
      summary,
      distribution,
      patients: orgStats.map(p => ({
        name: `${p.firstName} ${p.lastNamePaternal}`,
        assignedTo: p.psychologist ? 
          `${p.psychologist.firstName} ${p.psychologist.lastNamePaternal}` : 
          'Sin asignar'
      })),
      recommendations: {
        shouldRedistribute: distribution.some(d => d.isAdminRole && d.assignedPatientsCount > 0),
        maxPatientsPerPsychologist: Math.ceil(summary.totalPatients / Math.max(summary.purePsychologists, 1))
      }
    })

  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    })
  }
}