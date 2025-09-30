export const ROLE_ROUTES = {
  OWNER: '/app/owner',           // ← AGREGAR ESTA LÍNEA
  ADMIN: '/app/admin',
  PSYCHOLOGIST: '/app/psychologist',
  ASSISTANT: '/app/assistant',
  PATIENT: '/app/patient'
}

export const getRedirectPath = (roles: string[]): string => {
  if (roles.includes('OWNER')) return ROLE_ROUTES.OWNER
  if (roles.includes('ADMIN')) return ROLE_ROUTES.ADMIN
  if (roles.includes('PSYCHOLOGIST')) return ROLE_ROUTES.PSYCHOLOGIST
  if (roles.includes('ASSISTANT')) return ROLE_ROUTES.ASSISTANT
  if (roles.includes('PATIENT')) return ROLE_ROUTES.PATIENT
  return '/dashboard'
}

export const isValidRoleRoute = (role: string, path: string): boolean => {
  const allowedRoutes = {
    OWNER: ['/app/owner', '/app/admin', '/app/psychologist'],
    ADMIN: ['/app/admin', '/app/psychologist'],
    PSYCHOLOGIST: ['/app/psychologist'],
    ASSISTANT: ['/app/assistant'],
    PATIENT: ['/app/patient']
  }
  
  return allowedRoutes[role as keyof typeof allowedRoutes]?.includes(path) || false
}