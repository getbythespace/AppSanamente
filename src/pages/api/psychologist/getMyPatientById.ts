// src/pages/api/psychologist/getMyPatientById.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import type { AppRole } from '@/types/roles'

export default withApi(['GET'], ['PSYCHOLOGIST'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    const idParam = (req.query.id ?? '').toString()
    if (!idParam) return res.status(400).json({ ok: false, error: 'id requerido' })

    // Traer mis datos mínimos para validar organización
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true }
    })
    if (!me) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' })
    if (!me.organizationId) return res.status(400).json({ ok: false, error: 'Sin organización' })

    // Verificar vínculo ACTIVO paciente↔psicólogo en mi organización
    const assignment = await prisma.patientAssignment.findFirst({
      where: {
        organizationId: me.organizationId,
        psychologistId: me.id,
        patientId: idParam,
        status: 'ACTIVE',
      },
      select: { id: true, startedAt: true, status: true }
    })
    if (!assignment) {
      return res.status(403).json({ ok: false, error: 'No tienes acceso a este paciente (no vinculado)' })
    }

    // Paciente + métricas de ánimo últimos 30 días
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const patient = await prisma.user.findUnique({
      where: { id: idParam },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastNamePaternal: true,
        lastNameMaternal: true,
        rut: true,
        dob: true,
        moodEntries: {
          where: { date: { gte: since } },
          select: { score: true, date: true, comment: true },
          orderBy: { date: 'desc' }
        }
      }
    })
    if (!patient) return res.status(404).json({ ok: false, error: 'Paciente no encontrado' })

    // Últimas 10 notas de sesión (compat: con y sin assignmentId)
    const [sessionNotes, clinicalEntries] = await Promise.all([
      prisma.sessionNote.findMany({
        where: {
          OR: [
            { assignmentId: assignment.id },
            { assignmentId: null, patientId: idParam, psychologistId: me.id } // notas antiguas
          ]
        },
        select: { id: true, note: true, date: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.clinicalEntry.findMany({
        where: { assignmentId: assignment.id },
        select: { id: true, content: true, createdAt: true, authorId: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    const scores = patient.moodEntries.map(e => e.score)
    const avg30 = scores.length ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null
    const lastEntryAt = patient.moodEntries[0]?.date ?? null

    return res.json({
      ok: true,
      data: {
        assignment,
        patient: {
          id: patient.id,
          email: patient.email,
          firstName: patient.firstName,
          lastNamePaternal: patient.lastNamePaternal,
          lastNameMaternal: patient.lastNameMaternal,
          rut: patient.rut,
          dob: patient.dob,
          avg30,
          lastEntryAt
        },
        sessionNotes,
        clinicalEntries
      }
    })
  }
)
