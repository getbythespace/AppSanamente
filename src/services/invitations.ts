import { PrismaClient, RoleType } from '@prisma/client'
import crypto from 'crypto'
const prisma = new PrismaClient()

export function invite(params: { orgId: string; email: string; role: RoleType; invitedById?: string }) {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 días
  return prisma.invitation.create({
    data: {
      organizationId: params.orgId,
      email: params.email,
      role: params.role,
      invitedById: params.invitedById ?? null,
      token,
      expiresAt
    }
  })
}
