import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { role } = req.body

    if (!role) {
      return res.status(400).json({ error: 'Rol requerido' })
    }

    // Obtener usuario autenticado
    const supabase = createPagesServerClient({ req, res })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    // Obtener usuario con roles desde la base de datos
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { 
        roles: true,
        organization: true
      }
    })

    if (!dbUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // Verificar que el usuario tiene el rol solicitado
    const hasRole = dbUser.roles.some((userRole: any) => userRole.role === role)
    if (!hasRole) {
      return res.status(403).json({ error: 'No tienes permisos para este rol' })
    }

    // ✅ CORREGIDO: Verificar si es OWNER usando la organización
    if (role === 'OWNER' && dbUser.organization) {
      // El usuario debe ser el propietario de su organización
      // (En tu schema no hay ownerId, así que verificamos que tenga el rol OWNER)
      const hasOwnerRole = dbUser.roles.some((userRole: any) => userRole.role === 'OWNER')
      
      if (!hasOwnerRole) {
        return res.status(403).json({ error: 'No eres propietario de esta organización' })
      }
    }

    // Actualizar el rol activo en Supabase
    const { error: updateError } = await supabase.auth.updateUser({
      data: { 
        current_role: role,
        organization_id: dbUser.organizationId 
      }
    })

    if (updateError) {
      console.error('Error updating user role:', updateError)
      return res.status(500).json({ error: 'Error actualizando rol' })
    }

    return res.status(200).json({ 
      success: true,
      role,
      user: {
        id: dbUser.id,
        firstName: dbUser.firstName,
        lastName: dbUser.lastNamePaternal,
        organizationId: dbUser.organizationId
      }
    })

  } catch (error: any) {
    console.error('Error switching role:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}