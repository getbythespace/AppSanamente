import { prisma } from '../lib/prisma'

export async function getAccessiblePatients(user: any) {
  if (user.roles.some((r: any) => r.role === 'ADMIN')) {
    return prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        roles: { some: { role: 'PATIENT' } }
      }
    })
  }
  if (user.roles.some((r: any) => r.role === 'PSYCHOLOGIST')) {
    return prisma.user.findMany({
      where: {
        assignedPsychologistId: user.id,
        roles: { some: { role: 'PATIENT' } }
      }
    })
  }
  if (user.roles.some((r: any) => r.role === 'ASSISTANT')) {
    return prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        roles: { some: { role: 'PATIENT' } }
      }
    })
  }
  return prisma.user.findUnique({ where: { id: user.id } })
}