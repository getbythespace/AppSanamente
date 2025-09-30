import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import type { RoleType } from '@/types/roles'

export interface AuthenticatedUser {
  id: string
  email: string
  firstName: string
  lastNamePaternal: string
  organizationId: string | null
  activeRole: string | null
  isPsychologist: boolean
  roles: RoleType[]
}

export interface AuthResult { user: AuthenticatedUser }
export interface AuthError { error: string; status: number }

export async function getSessionUser(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthenticatedUser | null> {
  try {
    const supabase = createPagesServerClient({ req, res })
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user?.email) return null

    const user = await prisma.user.findUnique({
      where: { email: data.user.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastNamePaternal: true,
        organizationId: true,
        activeRole: true,
        isPsychologist: true,
        status: true,
        roles: { select: { role: true } },
      }
    })

    if (!user || user.status === 'INACTIVE') return null

    const dbRoles = user.roles.map(r => r.role as RoleType)
    const allRoles: RoleType[] = [...dbRoles]
    if (user.isPsychologist && !allRoles.includes('PSYCHOLOGIST')) allRoles.push('PSYCHOLOGIST')
    if (user.activeRole && !allRoles.includes(user.activeRole as RoleType)) allRoles.push(user.activeRole as RoleType)
    if (allRoles.length === 0) allRoles.push('PATIENT')

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastNamePaternal: user.lastNamePaternal,
      organizationId: user.organizationId,
      activeRole: user.activeRole,
      isPsychologist: user.isPsychologist,
      roles: allRoles,
    }
  } catch (e) {
    console.error('💥 [AUTH] Error getting session user:', e)
    return null
  }
}

export async function authenticateAndAuthorize(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedRoles: RoleType[]
): Promise<AuthResult | AuthError> {
  const user = await getSessionUser(req, res)
  if (!user) return { error: 'No autenticado', status: 401 }

  const hasRequiredRole = user.roles.some(role => allowedRoles.includes(role))
  if (!hasRequiredRole) return { error: 'Acceso denegado', status: 403 }

  return { user }
}

// Retrocompat
export async function requireRole(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedRoles: RoleType[]
) {
  return authenticateAndAuthorize(req, res, allowedRoles)
}
