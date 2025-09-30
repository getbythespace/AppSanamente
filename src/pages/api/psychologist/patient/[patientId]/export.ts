// src/pages/api/psychologist/patient/[patientId]/export.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
import { ensurePsychologistAccess, fullName } from '@/utils/ensurePsychologistAccess'
// @ts-ignore: no tenemos tipos locales
import PDFDocument from 'pdfkit'

export default withApi(
  ['GET'],
  ['PSYCHOLOGIST', 'ADMIN', 'OWNER', 'SUPERADMIN'],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId, roles }) => {
    const patientId = String(req.query.patientId || '')
    if (!patientId) return res.status(400).json({ ok: false, error: 'patientId requerido' })

    // Permisos
    const { patient } = await ensurePsychologistAccess(prisma as any, userId, patientId, roles as any)

    // Datos
    const [moods, sessionNotes, assignments, diagnoses] = await Promise.all([
      prisma.moodEntry.findMany({
        where: { patientId },
        select: { date: true, score: true, comment: true },
        orderBy: { date: 'asc' }
      }),
      prisma.sessionNote.findMany({
        where: { patientId },
        select: { id: true, date: true, note: true, psychologistId: true, createdAt: true },
        orderBy: { date: 'asc' }
      }),
      prisma.patientAssignment.findMany({
        where: { patientId },
        select: { id: true, startedAt: true, endedAt: true, status: true, psychologistId: true }
      }),
      prisma.diagnosis.findMany({
        where: { patientId },
        select: {
          id: true, createdAt: true, updatedAt: true, archived: true, text: true,
          previousVersions: { select: { archivedAt: true, text: true }, orderBy: { archivedAt: 'asc' } }
        },
        orderBy: { createdAt: 'asc' }
      })
    ])

    // Clinical entries: por assignments del paciente
    const assignmentIds = assignments.map(a => a.id)
    const clinicalEntries = assignmentIds.length
      ? await prisma.clinicalEntry.findMany({
          where: { assignmentId: { in: assignmentIds } },
          select: { id: true, createdAt: true, content: true, authorId: true, assignmentId: true },
          orderBy: { createdAt: 'asc' }
        })
      : []

    // PDF
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Paciente_${patient.rut || patient.id}.pdf"`)

    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    doc.pipe(res as any)

    // Header
    doc.fontSize(18).text('Informe del Paciente', { align: 'center' }).moveDown(0.5)
    doc.fontSize(12).text(`Fecha de emisión: ${new Date().toLocaleString('es-CL')}`, { align: 'center' })
    doc.moveDown()

    // Identificación
    doc.fontSize(14).text('Datos del Paciente', { underline: true }).moveDown(0.5)
    doc.fontSize(12)
    doc.text(`Nombre: ${fullName(patient)}`)
    doc.text(`RUT: ${patient.rut || '—'}`)
    doc.text(`Email: ${patient.email}`)
    doc.moveDown()

    // Ánimo
    doc.fontSize(14).text('Historial de Ánimo', { underline: true }).moveDown(0.5)
    if (!moods.length) {
      doc.text('No hay registros.')
    } else {
      moods.forEach(m =>
        doc.text(
          `${new Date(m.date).toLocaleString('es-CL')}  ·  ${m.score}/10${m.comment ? `  ·  "${m.comment}"` : ''}`
        )
      )
    }
    doc.moveDown()

    // Notas de sesión
    doc.fontSize(14).text('Bitácora de Sesiones', { underline: true }).moveDown(0.5)
    if (!sessionNotes.length) {
      doc.text('No hay notas.')
    } else {
      sessionNotes.forEach(n =>
        doc.text(`${new Date(n.date).toLocaleString('es-CL')}  ·  ${n.note}`)
      )
    }
    doc.moveDown()

    // Hoja clínica (append-only)
    doc.fontSize(14).text('Hoja Clínica (entradas)', { underline: true }).moveDown(0.5)
    if (!clinicalEntries.length) {
      doc.text('Sin entradas.')
    } else {
      clinicalEntries.forEach(c =>
        doc.text(`${new Date(c.createdAt).toLocaleString('es-CL')}  ·  ${c.content}`)
      )
    }
    doc.moveDown()

    // Diagnósticos + versiones
    doc.fontSize(14).text('Diagnósticos y Modificaciones', { underline: true }).moveDown(0.5)
    if (!diagnoses.length) {
      doc.text('Sin diagnósticos.')
    } else {
      diagnoses.forEach(d => {
        doc.text(
          `${new Date(d.createdAt).toLocaleDateString('es-CL')}  ·  ${d.archived ? '[Archivado] ' : ''}${d.text}`
        )
        if (d.previousVersions?.length) {
          d.previousVersions.forEach(v =>
            doc.text(`  ↳ ${new Date(v.archivedAt).toLocaleDateString('es-CL')}  ·  ${v.text}`)
          )
        }
      })
    }

    doc.end()
  }
)
