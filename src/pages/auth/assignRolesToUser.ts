import { PrismaClient, RoleType } from '@prisma/client'
const prisma = new PrismaClient()

export async function assignRolesToUser(userId: string, roles: RoleType[]) {
  const data = roles.map(role => ({ role, userId }))
  // Crea todos los roles en UserRole
  await prisma.userRole.createMany({
    data,
    skipDuplicates: true,
  })
}
