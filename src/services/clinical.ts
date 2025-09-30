import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export function addClinicalEntry(params: { assignmentId: string; authorId: string; content: string }) {
  const { assignmentId, authorId, content } = params
  return prisma.clinicalEntry.create({ data: { assignmentId, authorId, content } })
}

export function listClinicalEntries(assignmentId: string) {
  return prisma.clinicalEntry.findMany({
    where: { assignmentId },
    orderBy: { createdAt: 'desc' }
  })
}
