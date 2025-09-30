// src/utils/ensurePsychologistAccess.ts
import type { Prisma } from '@prisma/client'
import type { RoleType } from '@/types/roles'

type PrismaLike = {
  user: Prisma.UserDelegate
  patientAssignment: Prisma.PatientAssignmentDelegate
}

export async function ensurePsychologistAccess(
  prisma: PrismaLike,
  actingUserId: string,
  patientId: string,
  actingUserRoles: RoleType[] = []
) {
  // Usuario que hace la petición
  const me = await prisma.user.findUnique({
    where: { id: actingUserId },
    select: { id: true, organizationId: true, roles: { select: { role: true } } }
  })
  if (!me) throw new Error('Usuario no existe')

  const elevated = (actingUserRoles.length ? actingUserRoles : me.roles.map(r => r.role))
    .some(r => ['OWNER', 'ADMIN', 'SUPERADMIN'].includes(r as string))

  // Paciente
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: {
      id: true, organizationId: true, email: true, rut: true,
      firstName: true, lastNamePaternal: true, lastNameMaternal: true,
      assignedPsychologistId: true
    }
  })
  if (!patient) throw new Error('Paciente no encontrado')
  if (me.organizationId && patient.organizationId && me.organizationId !== patient.organizationId) {
    throw new Error('Prohibido: distinta organización')
  }

  // Asignación activa
  const activeAssign = await prisma.patientAssignment.findFirst({
    where: { patientId, psychologistId: me.id, status: 'ACTIVE' }
  })

  const allowed = elevated || patient.assignedPsychologistId === me.id || !!activeAssign
  if (!allowed) throw new Error('Prohibido: paciente no vinculado')

  return { me, patient, activeAssign }
}

export function fullName(u: {
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
}) {
  return `${u.firstName} ${u.lastNamePaternal} ${u.lastNameMaternal}`.trim()
}
