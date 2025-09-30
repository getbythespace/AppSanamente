import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/utils/getServerSession' // si tienes helper de sesión; si no, reemplaza por tu middleware
import { prisma } from '@/lib/prisma'                        // ajusta el import a tu proyecto
import { UserStatus } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ success: false, error: 'Invalid id' })

  try {
    // Autorización mínima (propietario/superadmin). Ajusta a tu guard.
    const session = await getServerSession(req, res)
    if (!session || !['OWNER', 'SUPERADMIN'].includes(session.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }

    const u = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true,
        email: true, rut: true, status: true, activeRole: true, dob: true,
        createdAt: true, updatedAt: true,
      },
    })
    if (!u) return res.status(404).json({ success: false, error: 'User not found' })

    const role = (u.activeRole ?? 'PATIENT') as any
    const payload = {
      id: u.id,
      firstName: u.firstName,
      lastNamePaternal: u.lastNamePaternal,
      lastNameMaternal: u.lastNameMaternal,
      email: u.email,
      rut: u.rut,
      role,
      isActive: u.status === UserStatus.ACTIVE,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt?.toISOString?.() ?? undefined,
      lastLogin: undefined as string | undefined, // si llevas último login en otra tabla, setéalo aquí
      birthDate: u.dob ? u.dob.toISOString() : undefined,
    }

    return res.status(200).json({ success: true, user: payload })
  } catch (e: any) {
    console.error('owner/users/[id] error', e)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
