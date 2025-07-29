import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from 'src/lib/prisma'
import { RoleType } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// ------ Validaciones con Zod ------
const userSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string()
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
    .regex(/(?=.*[A-Z])/, { message: 'Debe tener al menos una mayúscula.' })
    .regex(/(?=.*\d)/, { message: 'Debe tener al menos un número.' })
    .regex(/(?=.*[!@#$%^&*])/, { message: 'Debe tener al menos un símbolo.' }),
  rut: z.string().regex(/^\d{7,8}-[0-9kK]$/, { message: 'RUT inválido (ej: 12345678-9).' }),
  dob: z.string().refine((date) => {
    const edad = (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return edad >= 18
  }, { message: 'Debes ser mayor de edad.' }),
  firstName: z.string().min(2, { message: 'Nombre obligatorio.' }),
  lastNameP: z.string().min(2, { message: 'Apellido paterno obligatorio.' }),
  lastNameM: z.string().min(2, { message: 'Apellido materno obligatorio.' }),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    // Validar campos del body
    const parsed = userSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message })
    }
    const { firstName, lastNameP, lastNameM, rut, dob, email, password } = parsed.data

    // 1. Crear Organización "fantasma" para el psicólogo independiente
    const orgName = `Independiente: ${firstName} ${lastNameP}`
    const orgRut = `indep-${rut}` // rut sintético único
    const org = await prisma.organization.create({
      data: { name: orgName, rut: orgRut }
    })

    // 2. Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        firstName,
        lastNamePaternal: lastNameP,
        lastNameMaternal: lastNameM,
        rut,
        dob,
        isPsychologist: true,
        organizationId: org.id,
        roles: [RoleType.ADMIN, RoleType.PSYCHOLOGIST]
      }
    })

    if (authError || !authUser?.user) {
      // Rollback de la org creada si usuario falla en Supabase
      await prisma.organization.delete({ where: { id: org.id } })
      return res.status(400).json({ error: authError?.message || 'No se pudo crear el usuario en Supabase Auth.' })
    }
    const supabaseUserId = authUser.user.id

    // 3. Enviar invitación manual (correo de confirmación)
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)
    if (inviteError) {
      // Rollback completo si la invitación falla
      await supabase.auth.admin.deleteUser(supabaseUserId)
      await prisma.organization.delete({ where: { id: org.id } })
      return res.status(400).json({ error: inviteError.message })
    }

    // 4. Crear usuario en la base de datos Prisma
    try {
      await prisma.user.create({
        data: {
          id: supabaseUserId,
          email,
          firstName,
          lastNamePaternal: lastNameP,
          lastNameMaternal: lastNameM,
          rut,
          dob: new Date(dob),
          isPsychologist: true,
          organizationId: org.id,
          roles: {
            create: [
              { role: RoleType.ADMIN },
              { role: RoleType.PSYCHOLOGIST }
            ]
          }
        }
      })
    } catch (prismaError: any) {
      // Rollback total si Prisma falla
      await supabase.auth.admin.deleteUser(supabaseUserId)
      await prisma.organization.delete({ where: { id: org.id } })
      if (prismaError.code === 'P2002') {
        return res.status(409).json({ error: 'El email o RUT ya existen en la base de datos.' })
      }
      throw prismaError
    }

    res.status(201).json({
      ok: true,
      organizationId: org.id,
      userId: supabaseUserId,
      message: 'Psicólogo independiente creado. Revisa tu correo para confirmar tu cuenta.'
    })
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error inesperado.' })
  }
}
