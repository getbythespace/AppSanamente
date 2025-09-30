// prisma/seed.ts
import { PrismaClient, OrgPlan } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const orgs = await prisma.organization.findMany()
  for (const org of orgs) {
    const exists = await prisma.planLimit.findUnique({ where: { organizationId: org.id } })
    if (exists) continue
    const assistantsMax =
      org.plan === OrgPlan.SOLO ? 2 :
      org.plan === OrgPlan.TEAM ? 0 : 2
    await prisma.planLimit.create({
      data: { organizationId: org.id, assistantsMax }
    })
  }
  console.log('Seed PlanLimit OK')
}
main().finally(() => prisma.$disconnect())
