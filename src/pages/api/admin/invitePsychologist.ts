import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from 'src/lib/prisma'
import { RoleType } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSessionUser } from 'src/utils/auth-server' // backend

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const userSchema = z.object({
  firstName: z.string().min(2),
  lastNameP: z.string().min(2),
  lastNameM: z.string().min(2),
  rut: z.string().regex(/^\d{7,8}-[0-9kK]$/, 'RUT inválido (ej: 12345678-9).'),
  email: z.string().email(),
  dob: z.string()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  //Validación de admin
  const admin = await getSessionUser(req, res)
  if (!admin || !admin.roles.some((r: any) => r.role === 'ADMIN')) {
    return res.status(403).json({ error: 'Solo administradores pueden invitar psicólogos.' })
  }
  const organizationId = admin.organizationId
  if (!organizationId) {
    return res.status(400).json({ error: 'No tienes organización asociada.' })
  }

  //Validación de datos
  const parsed = userSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message })
  }
  const { firstName, lastNameP, lastNameM, rut, email, dob } = parsed.data

  //Validar que la organización existe
  const org = await prisma.organization.findUnique({ where: { id: organizationId } })
  if (!org) {
    return res.status(400).json({ error: 'Organización no existe' })
  }

  //Crear usuario en Supabase (Auth)
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      firstName,
      lastNamePaternal: lastNameP,
      lastNameMaternal: lastNameM,
      rut,
      dob,
      isPsychologist: true,
      roles: [RoleType.PSYCHOLOGIST],
      organizationId
    },
    redirectTo: "http://localhost:3000/auth/set-password"
  });

  if (authError || !authUser?.user) {
    return res.status(400).json({ error: authError?.message || 'No se pudo invitar al usuario.' })
  }
  const userId = authUser.user.id

  //Crear usuario en Prisma y manejar rollback
  try {
    await prisma.user.create({
      data: {
        id: userId,
        email,
        firstName,
        lastNamePaternal: lastNameP,
        lastNameMaternal: lastNameM,
        rut,
        dob: new Date(dob),
        isPsychologist: true,
        organizationId,
        roles: { create: [{ role: RoleType.PSYCHOLOGIST }] }
      }
    });
    return res.status(201).json({ ok: true, userId })
  } catch (prismaError: any) {
    //Rollback en Supabase si Prisma falla
    await supabaseAdmin.auth.admin.deleteUser(userId)
    if (prismaError.code === 'P2002') {
      return res.status(409).json({ error: 'Email o RUT duplicado.' })
    }
    return res.status(400).json({ error: prismaError.message || 'Error inesperado.' })
  }
}
