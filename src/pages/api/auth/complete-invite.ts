import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/services/supabaseAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
    if (!token) return res.status(401).json({ ok: false, error: 'Falta token' })

    const { data: userData, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !userData?.user) return res.status(401).json({ ok: false, error: 'Token inválido' })

    const sId = userData.user.id
    const sEmail = userData.user.email || ''

    // Obtener/ajustar usuario local
    let user = await prisma.user.findUnique({ where: { id: sId } })
    if (!user) {
      user = await prisma.user.findUnique({ where: { email: sEmail } })
      if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado en BD' })
      await prisma.user.update({ where: { id: user.id }, data: { id: sId } })
    }

    // Activar
    user = await prisma.user.update({ where: { id: sId }, data: { status: 'ACTIVE' } })

    // Si venía con assignedPsychologistId, crear/actualizar assignment (findFirst + update/create)
    if (user.assignedPsychologistId) {
      const existing = await prisma.patientAssignment.findFirst({ where: { patientId: user.id } })
      if (existing) {
        await prisma.patientAssignment.update({
          where: { id: existing.id },
          data: {
            psychologistId: user.assignedPsychologistId,
            organizationId: user.organizationId!,
            status: 'ACTIVE',
            endedAt: null,
          }
        })
      } else {
        await prisma.patientAssignment.create({
          data: {
            organizationId: user.organizationId!,
            patientId: user.id,
            psychologistId: user.assignedPsychologistId,
            status: 'ACTIVE',
            startedAt: new Date(),
          }
        })
      }
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('auth/complete-invite error:', e)
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
}
