import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from 'src/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { RoleType } from '@prisma/client'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const normalizeRut = (rut: string) =>
  rut.trim().replace(/\./g, '').replace(/\s/g, '').toUpperCase()

const schema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .regex(/(?=.*[A-Z])/, 'Debe tener al menos una mayúscula.')
    .regex(/(?=.*\d)/, 'Debe tener al menos un número.')
    .regex(/(?=.*[!@#$%^&*])/, 'Debe tener al menos un símbolo.'),
  rut: z.string()
    .transform(normalizeRut)
    .refine((v) => /^\d{7,8}-[0-9K]$/.test(v), 'RUT inválido (ej: 12.345.678-5).'),
  dob: z.coerce.date().refine((d) => {
    const age = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return age >= 18
  }, 'Debes ser mayor de edad.'),
  firstName: z.string().min(2, 'Nombre obligatorio.'),
  lastNameP: z.string().min(2, 'Apellido paterno obligatorio.'),
  lastNameM: z.string().min(2, 'Apellido materno obligatorio.')
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.issues[0].message })
  }

  const { firstName, lastNameP, lastNameM, rut, dob, email, password } = parsed.data

  try {
    const redirectTo =
      process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/login`
        : 'http://localhost:3000/auth/login'

    const { data: signUp, error: sErr } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          firstName,
          lastNamePaternal: lastNameP,
          lastNameMaternal: lastNameM,
          rut,
          dob: dob.toISOString().slice(0, 10),
          isPsychologist: true
        }
      }
    })
    if (sErr || !signUp.user) {
      return res.status(400).json({ error: sErr?.message || 'No se pudo registrar el usuario.' })
    }
    const supabaseUserId = signUp.user.id

    try {
      // Crea “Independiente: …” (plan por defecto definido en backfill o schema)
      const org = await prisma.organization.create({
        data: { name: `Independiente: ${firstName} ${lastNameP}`, rut: `indep-${rut}` }
      })

      await prisma.user.create({
        data: {
          id: supabaseUserId,
          email,
          firstName,
          lastNamePaternal: lastNameP,
          lastNameMaternal: lastNameM,
          rut,
          dob,
          isPsychologist: true,
          organizationId: org.id,
          roles: {
            create: [
              { role: RoleType.OWNER },
              { role: RoleType.ADMIN },
              { role: RoleType.PSYCHOLOGIST }
            ]
          }
        }
      })

      await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
        user_metadata: {
          organizationId: org.id,
          roles: [RoleType.OWNER, RoleType.ADMIN, RoleType.PSYCHOLOGIST]
        }
      })

      return res.status(201).json({
        ok: true,
        organizationId: org.id,
        userId: supabaseUserId,
        message: 'Cuenta creada. Revisa tu correo para confirmar tu cuenta.'
      })
    } catch (e: any) {
      await supabaseAdmin.auth.admin.deleteUser(supabaseUserId)
      if (e?.code === 'P2002') {
        return res.status(409).json({ error: 'RUT u email ya existentes.' })
      }
      throw e
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error inesperado.' })
  }
}
