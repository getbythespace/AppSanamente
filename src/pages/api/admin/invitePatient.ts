import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from 'src/lib/prisma'
import { RoleType } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSessionUser } from 'src/utils/auth-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const patientSchema = z.object({
  firstName: z.string().min(2),
  lastNameP: z.string().min(2),
  lastNameM: z.string().min(2),
  rut: z.string().regex(/^\d{7,8}-[0-9kK]$/, 'RUT inválido (ej: 12345678-9).'),
  email: z.string().email(),
  dob: z.string(),
  assignedPsychologistId: z.string()
  // Organization en base al token del admin
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  //Validación de admin y organización
  const admin = await getSessionUser(req, res)
  if (!admin || !admin.roles.some((r: any) => r.role === 'ADMIN')) {
    return res.status(403).json({ error: 'Solo administradores pueden invitar pacientes.' })
  }
  const organizationId = admin.organizationId
  if (!organizationId) {
    return res.status(400).json({ error: 'No tienes organización asociada.' })
  }

  //Validar datos
  const parsed = patientSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message })
  }
  const { firstName, lastNameP, lastNameM, rut, dob, email, assignedPsychologistId } = parsed.data

  //Validar org y psicólogo
  const org = await prisma.organization.findUnique({ where: { id: organizationId } })
  if (!org) {
    return res.status(400).json({ error: 'ID de organización inválido' })
  }
  const psychologist = await prisma.user.findUnique({ where: { id: assignedPsychologistId } })
  if (!psychologist || !psychologist.isPsychologist || psychologist.organizationId !== organizationId) {
    return res.status(400).json({ error: 'ID de psicólogo inválido o no pertenece a tu organización' })
  }

  try {
    // Redirige a set password
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        firstName,
        lastNamePaternal: lastNameP,
        lastNameMaternal: lastNameM,
        rut,
        dob,
        isPatient: true,
        roles: [RoleType.PATIENT],
        assignedPsychologistId,
        organizationId
      },
      redirectTo: "http://localhost:3000/auth/set-password"
    });

    if (authError || !authUser?.user) {
      return res.status(400).json({ error: authError?.message || 'No se pudo invitar al usuario.' })
    }
    const userId = authUser.user.id

    await prisma.user.create({
      data: {
        id: userId,
        email,
        firstName,
        lastNamePaternal: lastNameP,
        lastNameMaternal: lastNameM,
        rut,
        dob: new Date(dob),
        assignedPsychologistId,
        organizationId,
        roles: { create: [{ role: RoleType.PATIENT }] }
      }
    });

    res.status(201).json({ ok: true, userId });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Error inesperado.' })
  }
}
