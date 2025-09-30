import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    console.log('🔧 Iniciando corrección de asignaciones...')

    // 1. Obtener todos los pacientes
    const allPatients = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: 'PATIENT'
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true,
        assignedPsychologistId: true
      }
    })

    // 2. Obtener psicólogos que SOLO son psicólogos (no admin/owner)
    const purePsychologists = await prisma.user.findMany({
      where: {
        AND: [
          {
            roles: {
              some: {
                role: 'PSYCHOLOGIST'
              }
            }
          },
          {
            roles: {
              none: {
                role: {
                  in: ['ADMIN', 'OWNER', 'SUPERADMIN']
                }
              }
            }
          }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true
      }
    })

    console.log(`👥 Pacientes encontrados: ${allPatients.length}`)
    console.log(`🧠 Psicólogos puros encontrados: ${purePsychologists.length}`)

    if (purePsychologists.length === 0) {
      return res.json({
        ok: false,
        message: 'No hay psicólogos puros para asignar. Todos tienen roles administrativos.'
      })
    }

    // 3. Desasignar TODOS los pacientes primero
    await prisma.user.updateMany({
      where: {
        roles: {
          some: {
            role: 'PATIENT'
          }
        }
      },
      data: {
        assignedPsychologistId: null
      }
    })

    console.log('✅ Todos los pacientes desasignados')

    // 4. Redistribuir pacientes entre psicólogos puros
    const patientsPerPsychologist = Math.ceil(allPatients.length / purePsychologists.length)
    let currentPsychologistIndex = 0
    let patientsAssignedToCurrent = 0

    for (const patient of allPatients) {
      const currentPsychologist = purePsychologists[currentPsychologistIndex]
      
      await prisma.user.update({
        where: { id: patient.id },
        data: { assignedPsychologistId: currentPsychologist.id }
      })

      console.log(`✅ ${patient.firstName} ${patient.lastNamePaternal} → ${currentPsychologist.firstName} ${currentPsychologist.lastNamePaternal}`)

      patientsAssignedToCurrent++

      // Si ya asignamos suficientes pacientes a este psicólogo, pasar al siguiente
      if (patientsAssignedToCurrent >= patientsPerPsychologist && currentPsychologistIndex < purePsychologists.length - 1) {
        currentPsychologistIndex++
        patientsAssignedToCurrent = 0
      }
    }

    // 5. Verificar resultado
    const finalAssignments = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: 'PATIENT'
          }
        }
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

    const summary = purePsychologists.map(psy => ({
      psychologist: `${psy.firstName} ${psy.lastNamePaternal}`,
      assignedPatients: finalAssignments.filter(p => p.assignedPsychologistId === psy.id).length
    }))

    return res.json({
      ok: true,
      message: 'Asignaciones corregidas exitosamente',
      summary,
      assignments: finalAssignments.map(p => ({
        patient: `${p.firstName} ${p.lastNamePaternal}`,
        assignedTo: p.psychologist ? `${p.psychologist.firstName} ${p.psychologist.lastNamePaternal}` : 'Sin asignar'
      }))
    })

  } catch (error) {
    console.error('❌ Error fixing assignments:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return res.status(500).json({ 
      ok: false, 
      error: errorMessage 
    })
  }
}