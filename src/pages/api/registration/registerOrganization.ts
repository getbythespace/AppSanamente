
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from 'src/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { $Enums } from '@prisma/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const normalizeRut = (rut: string) =>
  rut.trim().replace(/\./g, '').replace(/\s/g, '').toUpperCase()

const rutRegex = /^\d{7,8}-[0-9K]$/i

const schema = z.object({
  // Organización
  name: z.string().trim().min(2, 'Nombre de organización requerido.'),
  orgRut: z.string()
    .transform(normalizeRut)
    .refine((v) => rutRegex.test(v), 'RUT de organización inválido (ej: 76.123.456-7).'),
  // Usuario
  email: z.string().trim().email('Email inválido.'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .regex(/(?=.*[A-Z])/, 'Debe tener al menos una mayúscula.')
    .regex(/(?=.*\d)/, 'Debe tener al menos un número.')
    .regex(/(?=.*[!@#$%^&*])/, 'Debe tener al menos un símbolo.'),
  firstName: z.string().trim().min(2, 'Nombre requerido.'),
  lastNameP: z.string().trim().min(2, 'Apellido paterno requerido.'),
  lastNameM: z.string().trim().min(2, 'Apellido materno requerido.'),
  rut: z.string()
    .transform(normalizeRut)
    .refine((v) => rutRegex.test(v), 'RUT de usuario inválido (ej: 12.345.678-5).'),
  dob: z.coerce.date().refine((d) => {
    const age = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return age >= 18
  }, 'Debes ser mayor de edad.'),
  isPsychologist: z.boolean().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.issues[0].message })
  }

  const { name, orgRut, email, password, firstName, lastNameP, lastNameM, rut, dob, isPsychologist } = parsed.data

  try {
    // 1) Supabase signup
    const redirectTo =
      process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/login`
        : 'http://localhost:3000/auth/login'

    const { data: signUp, error: sErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          firstName,
          lastNamePaternal: lastNameP,
          lastNameMaternal: lastNameM,
          rut, // usuario
          dob: dob.toISOString().slice(0, 10),
          isPsychologist: !!isPsychologist,
          organizationId: null,
          roles: !!isPsychologist ? ['OWNER','ADMIN','PSYCHOLOGIST'] : ['OWNER','ADMIN']
        }
      }
    })
    if (sErr || !signUp.user) {
      return res.status(400).json({ error: sErr?.message || 'No se pudo registrar el usuario.' })
    }
    const supabaseUserId = signUp.user.id

    // 2) Prisma
    try {
      const org = await prisma.organization.create({
        data: { name, rut: orgRut } // plan = TEAM por default (schema)
      })

      await prisma.user.create({
        data: {
          id: supabaseUserId,
          email,
          firstName,
          lastNamePaternal: lastNameP,
          lastNameMaternal: lastNameM,
          rut, // usuario
          dob,
          isPsychologist: !!isPsychologist,
          organizationId: org.id,
          roles: {
            create: !!isPsychologist
              ? [
                  { role: $Enums.RoleType.OWNER },
                  { role: $Enums.RoleType.ADMIN },
                  { role: $Enums.RoleType.PSYCHOLOGIST }
                ]
              : [
                  { role: $Enums.RoleType.OWNER },
                  { role: $Enums.RoleType.ADMIN }
                ]
          }
        }
      })

      return res.status(201).json({
        ok: true,
        organizationId: org.id,
        userId: supabaseUserId,
        message: 'Organización registrada. Revisa tu correo para confirmar tu cuenta.'
      })
    } catch (e: any) {
      await supabase.auth.admin.deleteUser(supabaseUserId)
      if (e?.code === 'P2002') {
        return res.status(409).json({ error: 'RUT de organización o usuario/email ya existentes.' })
      }
      throw e
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error inesperado.' })
  }
}
