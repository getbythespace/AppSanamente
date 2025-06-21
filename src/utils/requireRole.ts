// filepath: src/utils/requireRole.ts
import { prisma } from '../lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

export async function requireRole(req: any, allowedRoles: string[]) {
  const { userId } = getAuth(req)
  if (!userId) throw new Error('No autenticado')
  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { roles: true }
  })
  if (
    !user ||
    !user.roles.some((r: any) => allowedRoles.includes(r.role))
  ) throw new Error('No autorizado')
  return user
}