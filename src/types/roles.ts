export type RoleType = 'SUPERADMIN' | 'OWNER' | 'ADMIN' | 'ASSISTANT' | 'PSYCHOLOGIST' | 'PATIENT'

// AGREGAR AppRole como alias para compatibilidad
export type AppRole = RoleType

export const ROLES: Record<RoleType, string> = {
  SUPERADMIN: 'Super Administrador',
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  ASSISTANT: 'Asistente',
  PSYCHOLOGIST: 'Psicólogo',
  PATIENT: 'Paciente'
}

export const ROLE_HIERARCHY: Record<RoleType, number> = {
  SUPERADMIN: 100,
  OWNER: 80,
  ADMIN: 60,
  PSYCHOLOGIST: 40,
  ASSISTANT: 20,
  PATIENT: 10
}

// VALORES VÁLIDOS COMO ARRAY
export const VALID_ROLES: RoleType[] = [
  'SUPERADMIN', 
  'OWNER', 
  'ADMIN', 
  'ASSISTANT', 
  'PSYCHOLOGIST', 
  'PATIENT'
]

// FUNCIÓN HELPER PARA VALIDAR ROLES
export function isValidRole(role: string): role is RoleType {
  return VALID_ROLES.includes(role as RoleType)
}