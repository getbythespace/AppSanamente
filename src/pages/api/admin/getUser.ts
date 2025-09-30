// src/pages/api/admin/getUser.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { authenticateAndAuthorize } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' })
  }

  try {
    const auth = await authenticateAndAuthorize(req, res, ['ADMIN', 'OWNER', 'SUPERADMIN'])
    if ('error' in auth) {
      return res.status(auth.status).json({ ok: false, error: auth.error })
    }
    const me = auth.user
    const id = String(req.query.id || '').trim()
    if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' })

    const u = await prisma.user.findUnique({
      where: { id },
      include: { roles: true }
    })
    if (!u) return res.status(404).json({ ok: false, error: 'No encontrado' })

    const isSuperAdmin = !!(await prisma.userRole.findFirst({
      where: { userId: me.id, role: 'SUPERADMIN' }
    }))

    if (me.organizationId && u.organizationId !== me.organizationId && !isSuperAdmin) {
      return res.status(403).json({ ok: false, error: 'Acceso denegado' })
    }

    const roles = u.roles.map(r => r.role)
    let primaryRole: any = 'PATIENT'
    if (roles.includes('OWNER')) primaryRole = 'OWNER'
    else if (roles.includes('ADMIN')) primaryRole = 'ADMIN'
    else if (roles.includes('PSYCHOLOGIST')) primaryRole = 'PSYCHOLOGIST'
    else if (roles.includes('ASSISTANT')) primaryRole = 'ASSISTANT'

    const data = {
      id: u.id,
      firstName: u.firstName,
      lastNamePaternal: u.lastNamePaternal,
      lastNameMaternal: u.lastNameMaternal,
      email: u.email,
      rut: u.rut,
      role: primaryRole,
      isActive: u.status === 'ACTIVE',
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      phone: (u as any).phone ?? undefined,
      birthDate: (u as any).dob ? new Date((u as any).dob).toISOString() : undefined,
      address: (u as any).address ?? undefined
    }

    return res.status(200).json({ ok: true, data })
  } catch (err: any) {
    console.error('[ADMIN/getUser] error', err)
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
}
