import { supabase } from '../services/db'
import { prisma } from '../lib/prisma'
import type { NextApiRequest } from 'next'

export async function getAuthenticatedUser(req: NextApiRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) throw new Error('No autenticado')

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('No autenticado')

  // Incluye roles y organización y psicólogo asignado
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      roles: true,
      organization: true,
      psychologist: true,
    }
  })
  if (!dbUser) throw new Error('Usuario no encontrado')
  return dbUser
}

//verifica si tiene roles específicos
export function hasRole(user: any, allowedRoles: string[]) {
  return user.roles.some((r: any) => allowedRoles.includes(r.role))
}