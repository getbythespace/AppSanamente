
import { prisma } from '../lib/prisma'
import { supabase } from '../services/db'

export async function requireRole(req: any, allowedRoles: string[]) {
  // Obtener el token de sesión de Supabase desde el header Auth
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) throw new Error('No autenticado')

  // Validar el token y obtener el usuario
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('No autenticado')

  // Buscar el usuario x  id de Supabase
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { roles: true }
  })
  if (
    !dbUser ||
    !dbUser.roles.some((r: any) => allowedRoles.includes(r.role))
  ) throw new Error('No autorizado')
  return dbUser
}