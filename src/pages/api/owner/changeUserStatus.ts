import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/utils/getServerSession' // ajusta a tu auth
import { prisma } from '@/lib/prisma'                        // ajusta a tu proyecto
import { UserStatus } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' })

  try {
    const session = await getServerSession(req, res)
    if (!session || !['OWNER', 'SUPERADMIN'].includes(session.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }

    const { userId, isActive } = req.body as { userId?: string; isActive?: boolean }
    if (!userId || typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Invalid payload' })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE },
      select: { id: true, status: true, updatedAt: true },
    })

    return res.status(200).json({ success: true, user: { id: updated.id, isActive: updated.status === UserStatus.ACTIVE } })
  } catch (e: any) {
    console.error('owner/changeUserStatus error', e)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
