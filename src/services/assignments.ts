import { PrismaClient, AssignmentStatus } from '@prisma/client'
const prisma = new PrismaClient()

export async function getPoolPatients(orgId: string) {
  // pacientes de la org SIN assignment ACTIVE
  return prisma.user.findMany({
    where: {
      organizationId: orgId,
      roles: { some: { role: 'PATIENT' } },
      assignmentsAsPatient: { none: { status: AssignmentStatus.ACTIVE } }
    },
    select: { id: true, firstName: true, lastNamePaternal: true, rut: true, createdAt: true }
  })
}

export async function getMyPatients(psychologistId: string) {
  return prisma.patientAssignment.findMany({
    where: { psychologistId, status: AssignmentStatus.ACTIVE },
    include: { patient: true }
  })
}

export async function createAssignment(params: { orgId: string; patientId: string; psychologistId: string }) {
  const { orgId, patientId, psychologistId } = params
  return prisma.$transaction(async (tx) => {
    const active = await tx.patientAssignment.findFirst({
      where: { patientId, status: AssignmentStatus.ACTIVE }
    })
    if (active) throw new Error('El paciente ya está vinculado.')

    return tx.patientAssignment.create({
      data: { organizationId: orgId, patientId, psychologistId, status: AssignmentStatus.ACTIVE }
    })
  })
}

export async function endAssignment(assignmentId: string, reason?: string) {
  return prisma.patientAssignment.update({
    where: { id: assignmentId },
    data: { status: AssignmentStatus.ENDED, endedAt: new Date(), endedReason: reason ?? null }
  })
}
