// src/pages/api/admin/changeUserStatus.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { authenticateAndAuthorize } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' })
  }

  try {
    const auth = await authenticateAndAuthorize(req, res, ['ADMIN', 'OWNER', 'SUPERADMIN'])
    if ('error' in auth) {
      return res.status(auth.status).json({ ok: false, error: auth.error })
    }
    const me = auth.user

    const { userId, isActive } = req.body || {}
    if (!userId || typeof isActive !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'Parámetros inválidos' })
    }

    const target = await prisma.user.findUnique({
      where: { id: String(userId) },
      include: { roles: true }
    })
    if (!target) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' })

    // 👇 No dependas de auth.roles
    const isSuperAdmin = !!(await prisma.userRole.findFirst({
      where: { userId: me.id, role: 'SUPERADMIN' }
    }))

    if (me.organizationId && target.organizationId !== me.organizationId && !isSuperAdmin) {
      return res.status(403).json({ ok: false, error: 'Acceso denegado' })
    }

    const isTargetOwner = target.roles.some(r => r.role === 'OWNER')
    if (isTargetOwner && !isSuperAdmin) {
      return res.status(403).json({ ok: false, error: 'No puedes cambiar el estado del propietario' })
    }

    const status = isActive ? 'ACTIVE' : 'INACTIVE'
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { status, updatedAt: new Date() }
    })

    return res.status(200).json({
      ok: true,
      data: { id: updated.id, isActive: updated.status === 'ACTIVE' }
    })
  } catch (err: any) {
    console.error('[ADMIN/changeUserStatus] error', err)
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
}
