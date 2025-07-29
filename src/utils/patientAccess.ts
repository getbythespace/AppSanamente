import { prisma } from '../lib/prisma'

export async function getAccessiblePatients(user: any) {
  if (user.roles.some((r: any) => r.role === 'ADMIN')) {
    // Admin ve todos los pacientes de su organización (verificar que no pueda ver datos sensibles)
    return prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        roles: { some: { role: 'PATIENT' } }
      }
    })
  }
  if (user.roles.some((r: any) => r.role === 'PSYCHOLOGIST')) {
    // Psicólogo ve solo sus pacientes vinculados
    return prisma.user.findMany({
      where: {
        assignedPsychologistId: user.id,
        roles: { some: { role: 'PATIENT' } }
      }
    })
  }
  if (user.roles.some((r: any) => r.role === 'ASSISTANT')) {
    // Asistente ve pacientes de psicólogos de su organización (verificar que no pueda ver datos sensibles)
    return prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        roles: { some: { role: 'PATIENT' } }
      }
    })
  }
  // Paciente solo se ve a sí mismo
  return prisma.user.findUnique({ where: { id: user.id } })
}