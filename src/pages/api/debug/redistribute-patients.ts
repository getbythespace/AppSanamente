import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/pages/api/_utils/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const authUser = await requireUser(req, res)
  if (!authUser) return

  // Verificar que tenga permisos de admin/owner
  const userRoles = await prisma.userRole.findMany({
    where: { userId: authUser.id },
    select: { role: true }
  })

  const hasAdminPermission = userRoles.some(r => 
    ['ADMIN', 'OWNER', 'SUPERADMIN'].includes(r.role)
  )

  if (!hasAdminPermission) {
    return res.status(403).json({ 
      ok: false, 
      error: 'Solo admins pueden redistribuir pacientes' 
    })
  }

  try {
    // Obtener organización del usuario actual
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { organizationId: true }
    })

    if (!currentUser?.organizationId) {
      return res.status(400).json({ ok: false, error: 'Usuario sin organización' })
    }

    // 1. Obtener todos los pacientes de la organización
    const allPatients = await prisma.user.findMany({
      where: {
        organizationId: currentUser.organizationId,
        status: 'ACTIVE',
        roles: { some: { role: 'PATIENT' } }
      },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true,
        assignedPsychologistId: true
      }
    })

    // 2. Obtener psicólogos PUROS (sin roles admin)
    const purePsychologists = await prisma.user.findMany({
      where: {
        organizationId: currentUser.organizationId,
        status: 'ACTIVE',
        AND: [
          { roles: { some: { role: 'PSYCHOLOGIST' } } },
          { roles: { none: { role: { in: ['ADMIN', 'OWNER', 'SUPERADMIN'] } } } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true
      }
    })

    console.log(`📊 Organización: ${currentUser.organizationId}`)
    console.log(`👥 Pacientes: ${allPatients.length}`)
    console.log(`🧠 Psicólogos puros: ${purePsychologists.length}`)

    // 3. Estrategia de redistribución
    let redistributions = []

    if (purePsychologists.length === 0) {
      // Si no hay psicólogos puros, desasignar todos
      console.log('⚠️ No hay psicólogos puros, desasignando todos los pacientes')
      
      for (const patient of allPatients) {
        if (patient.assignedPsychologistId) {
          await prisma.user.update({
            where: { id: patient.id },
            data: { assignedPsychologistId: null }
          })
          
          redistributions.push({
            patient: `${patient.firstName} ${patient.lastNamePaternal}`,
            action: 'UNASSIGNED',
            reason: 'No hay psicólogos puros disponibles'
          })
        }
      }
    } else {
      // Redistribuir equitativamente entre psicólogos puros
      const patientsPerPsychologist = Math.ceil(allPatients.length / purePsychologists.length)
      
      console.log(`📈 Máximo ${patientsPerPsychologist} pacientes por psicólogo`)

      // Primero desasignar todos
      await prisma.user.updateMany({
        where: {
          organizationId: currentUser.organizationId,
          status: 'ACTIVE',
          roles: { some: { role: 'PATIENT' } }
        },
        data: { assignedPsychologistId: null }
      })

      // Luego redistribuir
      let currentPsyIndex = 0
      let patientsAssignedToCurrent = 0

      for (const patient of allPatients) {
        const currentPsychologist = purePsychologists[currentPsyIndex]
        
        await prisma.user.update({
          where: { id: patient.id },
          data: { assignedPsychologistId: currentPsychologist.id }
        })

        redistributions.push({
          patient: `${patient.firstName} ${patient.lastNamePaternal}`,
          action: 'ASSIGNED',
          assignedTo: `${currentPsychologist.firstName} ${currentPsychologist.lastNamePaternal}`
        })

        patientsAssignedToCurrent++

        // Cambiar al siguiente psicólogo si alcanzamos el límite
        if (patientsAssignedToCurrent >= patientsPerPsychologist && 
            currentPsyIndex < purePsychologists.length - 1) {
          currentPsyIndex++
          patientsAssignedToCurrent = 0
        }
      }
    }

    // 4. Verificar resultado
    const finalDistribution = await prisma.user.findMany({
      where: {
        organizationId: currentUser.organizationId,
        status: 'ACTIVE',
        roles: { some: { role: 'PATIENT' } }
      },
      select: {
        assignedPsychologistId: true,
        psychologist: {
          select: { firstName: true, lastNamePaternal: true }
        }
      }
    })

    const finalSummary = purePsychologists.map(psy => ({
      psychologist: `${psy.firstName} ${psy.lastNamePaternal}`,
      assignedPatients: finalDistribution.filter(p => p.assignedPsychologistId === psy.id).length
    }))

    return res.json({
      ok: true,
      message: 'Redistribución completada exitosamente',
      summary: {
        totalPatients: allPatients.length,
        purePsychologists: purePsychologists.length,
        redistributions: redistributions.length
      },
      finalDistribution: finalSummary,
      changes: redistributions
    })

  } catch (error) {
    console.error('❌ Error:', error)
    return res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    })
  }
}