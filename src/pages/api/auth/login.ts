import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    const supabase = createServerSupabaseClient({ req, res })

    // Hacer login con Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      console.error('Supabase auth error:', authError)
      return res.status(401).json({ 
        error: authError?.message || 'Credenciales inválidas' 
      })
    }

    // Buscar el usuario en nuestra base de datos
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          select: {
            role: true
          }
        }
      }
    })

    if (!user) {
      // Si el usuario no existe en nuestra DB, cerrar sesión de Supabase
      await supabase.auth.signOut()
      return res.status(404).json({ 
        error: 'Usuario no encontrado en el sistema' 
      })
    }

    // FIXED: Retornar estructura consistente
    return res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastNamePaternal: user.lastNamePaternal,
        lastNameMaternal: user.lastNameMaternal,
        organizationId: user.organizationId,
        status: user.status,
        roles: user.roles
      }
    })

  } catch (error) {
    console.error('Error in login:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    })
  }
}