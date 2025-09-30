import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/services/supabaseAdmin'
import { serialize } from 'cookie'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    let token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token && req.cookies) {
      token = req.cookies['sb-access-token']
    }
    
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !data.user) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    const userId = data.user.id
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        roles: true
      }
    })

    if (!dbUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const { role } = req.body
    
    if (!role) {
      return res.status(400).json({ error: 'Rol no especificado' })
    }

    // ✅ LÓGICA COMPLETA: Obtener todos los roles (tabla + automáticos)
    const userRoles = [...dbUser.roles.map(r => r.role)]
    
    // Agregar roles automáticos
    if (dbUser.isPsychologist && !userRoles.includes('PSYCHOLOGIST')) {
      userRoles.push('PSYCHOLOGIST')
    }
    
    // PATIENT por defecto si no tiene otros roles
    if (userRoles.length === 0) {
      userRoles.push('PATIENT')
    }

    // ✅ DEBUG MEJORADO
    console.log(`🔍 Usuario ${userId} (${dbUser.email})`)
    console.log(`📊 Roles en BD:`, dbUser.roles.map(r => r.role))
    console.log(`🎯 Roles finales disponibles:`, userRoles)
    console.log(`🔄 Solicitando cambio a:`, role)

    if (!userRoles.includes(role)) {
      console.error(`❌ Usuario ${userId} intentó usar rol ${role} pero solo tiene: ${userRoles.join(', ')}`)
      return res.status(403).json({ 
        error: 'No tienes permiso para usar este rol',
        availableRoles: userRoles,
        requestedRole: role
      })
    }

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { activeRole: role }
      })
      console.log(`✅ ActiveRole actualizado en BD: ${role}`)
    } catch (dbError) {
      console.warn('⚠️ No se pudo actualizar activeRole en la base de datos:', dbError)
    }

    const roleCookie = serialize('active-role', role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    console.log(`🚀 Usuario ${userId} cambió exitosamente al rol: ${role}`)

    res.setHeader('Set-Cookie', roleCookie)
    res.status(200).json({ 
      success: true, 
      role,
      availableRoles: userRoles,
      message: `Rol cambiado a ${role}` 
    })
  } catch (err) {
    console.error('💥 Error al establecer rol:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}