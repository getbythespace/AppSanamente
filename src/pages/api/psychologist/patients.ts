import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/services/supabaseAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    // Verificar autenticación
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.['sb-access-token']
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    const psychologistId = data.user.id

    // Obtener pacientes asignados con información adicional
    const assignments = await prisma.patientAssignment.findMany({
      where: {
        psychologistId,
        status: 'ACTIVE'
      },
      include: {
        patient: {
          include: {
            sessionNotesAsPatient: {
              where: { psychologistId },
              orderBy: { date: 'desc' },
              take: 1
            }
          }
        },
        clinicalEntries: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    const patients = assignments.map(assignment => ({
      id: assignment.patient.id,
      firstName: assignment.patient.firstName,
      lastNamePaternal: assignment.patient.lastNamePaternal,
      lastNameMaternal: assignment.patient.lastNameMaternal,
      email: assignment.patient.email,
      rut: assignment.patient.rut,
      assignmentId: assignment.id,
      lastSession: assignment.patient.sessionNotesAsPatient[0] ? {
        id: assignment.patient.sessionNotesAsPatient[0].id,
        date: assignment.patient.sessionNotesAsPatient[0].date,
        note: assignment.patient.sessionNotesAsPatient[0].note
      } : null,
      clinicalSheet: assignment.clinicalEntries.length > 0 ? {
        id: assignment.clinicalEntries[0].id,
        lastUpdated: assignment.clinicalEntries[0].createdAt,
        entriesCount: assignment.clinicalEntries.length
      } : null
    }))

    res.status(200).json({ patients })
  } catch (err) {
    console.error('Error al obtener pacientes:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}