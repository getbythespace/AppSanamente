// src/pages/api/superadmin/audit/export.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { withApi } from '@/utils/apiHandler'
// @ts-ignore
import PDFDocument from 'pdfkit'

export default withApi(
  ['GET'],
  ['SUPERADMIN'],
  async (req: NextApiRequest, res: NextApiResponse, { prisma }) => {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const to = req.query.to ? new Date(String(req.query.to)) : new Date()

    const logs = await prisma.auditLog.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        createdAt: true,
        userId: true,
        action: true,
        targetId: true,
        description: true,
        user: { select: { email: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Auditoria_${from.toISOString().slice(0,10)}_${to.toISOString().slice(0,10)}.pdf"`)

    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    doc.pipe(res as any)

    doc.fontSize(18).text('Auditoría de la Aplicación', { align: 'center' }).moveDown(0.5)
    doc.fontSize(12).text(`Periodo: ${from.toLocaleString('es-CL')} – ${to.toLocaleString('es-CL')}`, { align: 'center' })
    doc.moveDown()

    if (!logs.length) {
      doc.text('Sin eventos en el periodo.')
      doc.end()
      return
    }

    logs.forEach(l => {
      doc.text(
        `${new Date(l.createdAt).toLocaleString('es-CL')} · ${l.user?.email || l.userId} · ${l.action}` +
        `${l.targetId ? ` · target=${l.targetId}` : ''}` +
        `${l.description ? ` · ${l.description}` : ''}`
      )
    })

    doc.end()
  }
)
