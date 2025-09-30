// src/pages/api/auth/set.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import { RoleType } from '@prisma/client'

function asRoleArray(input: any): RoleType[] {
  if (!input) return []
  const arr = Array.isArray(input) ? input : [input]
  const allowed = new Set< string | RoleType >([
    'SUPERADMIN','OWNER','ADMIN','ASSISTANT','PSYCHOLOGIST','PATIENT'
  ])
  return arr
    .map((r: any) => String(r).toUpperCase())
    .filter((r: any) => allowed.has(r)) as RoleType[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createPagesServerClient({ req, res })
    const { event, session } = req.body

    if (event === 'SIGNED_OUT') {
      await supabase.auth.signOut()
      return res.status(200).json({ message: 'Sesión cerrada con éxito' })
    }

    if (event !== 'SIGNED_IN' || !session) {
      return res.status(400).json({ error: 'Evento o sesión no válidos' })
    }

    // 1) Establecer sesión (cookies de Supabase)
    const { error: setErr } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    })
    if (setErr) {
      console.error('Error setting session:', setErr)
      return res.status(400).json({ error: 'Error estableciendo sesión' })
    }

    // 2) Usuario actual (con metadata)
    const { data: ures, error: uerr } = await supabase.auth.getUser()
    if (uerr || !ures?.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    const authUser = ures.user
    const uid = authUser.id
    const email = (authUser.email || '').toLowerCase()

    // 3) Si ya existe en Prisma, terminar
    const exists = await prisma.user.findUnique({ where: { id: uid } })
    if (exists) {
      return res.status(200).json({ message: 'Autenticación establecida con éxito' })
    }

    // 4) Buscar invitación pendiente por email
    const invite = await prisma.userInvitation.findFirst({
      where: { email, status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    })

    // 5) Datos base: metadata > invitación
    const md = authUser.user_metadata || {}
    const firstName = String(md.firstName || invite?.firstName || '').trim()
    const lastNamePaternal = String(md.lastNamePaternal || invite?.lastNamePaternal || '').trim()
    const lastNameMaternal = String(md.lastNameMaternal || invite?.lastNameMaternal || '').trim()
    const rutFromMdOrInvite = String(md.rut || invite?.rut || '').trim()
    const dobIso = (md.dob || null) as string | null
    const dob = dobIso ? new Date(dobIso) : null
    const isPsychologist: boolean = !!(md.isPsychologist || (invite?.role === 'PSYCHOLOGIST'))

    // Roles: invitación > metadata
    const rolesFromInvite: RoleType[] = invite?.role ? [invite.role as RoleType] : []
    const rolesFromMd: RoleType[] = asRoleArray(md.roles)
    const rolesToCreate: RoleType[] = Array.from(new Set([...rolesFromInvite, ...rolesFromMd]))

    // Organización: invitación > metadata
    let organizationId = (invite?.organizationId || md.organizationId || null) as string | null

    // 6) Si no hay organización y es psicólogo -> crear “Independiente: …”
    if (!organizationId && isPsychologist) {
      const display = `${firstName || 'Usuario'} ${lastNamePaternal || ''}`.trim()
      const org = await prisma.organization.create({
        data: { name: `Independiente: ${display}`, rut: `indep-${uid.slice(0,8)}` }
      })
      organizationId = org.id
    }

    // 7) Cumplir con campos OBLIGATORIOS del schema User
    //    - firstName / lastNamePaternal / lastNameMaternal: String NOT NULL
    //    - rut: String @unique NOT NULL  -> si no viene, generamos uno temporal único.
    const safeFirstName = firstName || (email.split('@')[0] || 'Usuario')
    const safeLastP = lastNamePaternal || ''
    const safeLastM = lastNameMaternal || ''
    const safeRut = rutFromMdOrInvite || `temp-${uid.slice(0, 12)}` // asegura unicidad

    // 8) Crear usuario en Prisma (id = id Supabase)
    const created = await prisma.user.create({
      data: {
        id: uid,
        email,
        rut: safeRut,
        firstName: safeFirstName,
        lastNamePaternal: safeLastP,
        lastNameMaternal: safeLastM,
        dob: dob || undefined,
        isPsychologist,
        organizationId: organizationId || undefined,
        status: 'ACTIVE',
        roles: rolesToCreate.length
          ? { create: rolesToCreate.map(r => ({ role: r })) }
          : undefined
      }
    })

    // 9) Si había invitación, marcar como ACCEPTED (sin acceptedAt/acceptedById)
    if (invite) {
      await prisma.userInvitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' }
      })

      // (Opcional) Auditar aceptación
      await prisma.auditLog.create({
        data: {
          userId: created.id,
          action: 'INVITATION_ACCEPTED',
          targetId: invite.id,
          description: `Aceptó invitación como ${invite.role} (${email})`
        }
      })
    }

    return res.status(200).json({ message: 'Autenticación y aprovisionamiento OK' })
  } catch (error: any) {
    console.error('Error en /api/auth/set:', error)
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
