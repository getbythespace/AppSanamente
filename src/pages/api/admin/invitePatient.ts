
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
  email: z.string().email(),
  firstName: z.string().min(2),
  lastNameP: z.string().min(2),
  lastNameM: z.string().min(2),
  rut: z.string()
    .transform(normalizeRut)
    .refine((v) => /^\d{7,8}-[0-9K]$/.test(v), 'RUT inválido (ej: 12.345.678-5).'),
  dob: z.coerce.date().optional(),
  assignedPsychologistId: z.string().uuid().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta token Bearer' })
  }
  const token = authHeader.slice(7)
  const { data: tokenUser, error: tokenErr } = await supabaseAdmin.auth.getUser(token)
  if (tokenErr || !tokenUser?.user) {
    return res.status(401).json({ error: 'No autenticado' })
  }

  const admin = await prisma.user.findUnique({
    where: { id: tokenUser.user.id },
    include: { roles: true }
  })
  if (!admin) return res.status(401).json({ error: 'No autenticado' })

  const roles = admin.roles.map(r => r.role)
  const isOwnerOrAdmin = roles.includes(RoleType.OWNER) || roles.includes(RoleType.ADMIN)
  if (!isOwnerOrAdmin) {
    return res.status(403).json({ error: 'Solo OWNER/ADMIN pueden invitar pacientes.' })
  }
  if (!admin.organizationId) {
    return res.status(400).json({ error: 'No tienes organización asociada.' })
  }

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.issues[0].message })
  }
  const { email, firstName, lastNameP, lastNameM, rut, dob, assignedPsychologistId } = parsed.data

  let targetPsychologistId = assignedPsychologistId
  if (!targetPsychologistId) {
    const adminIsPsych = roles.includes(RoleType.PSYCHOLOGIST)
    if (adminIsPsych) targetPsychologistId = admin.id
    else return res.status(400).json({ error: 'Debes indicar assignedPsychologistId (el admin no es psicólogo).' })
  }

  const psychologist = await prisma.user.findFirst({
    where: {
      id: targetPsychologistId,
      organizationId: admin.organizationId,
      roles: { some: { role: RoleType.PSYCHOLOGIST } }
    }
  })
  if (!psychologist) {
    return res.status(400).json({ error: 'Psicólogo asignado inválido o no pertenece a tu organización.' })
  }

  const redirectTo =
    process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/set-password`
      : 'http://localhost:3000/auth/set-password'

  const { data: invited, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      firstName,
      lastNamePaternal: lastNameP,
      lastNameMaternal: lastNameM,
      rut,
      dob: dob ? dob.toISOString().slice(0, 10) : null,
      isPatient: true,
      roles: [RoleType.PATIENT],
      assignedPsychologistId: psychologist.id,
      organizationId: admin.organizationId
    },
    redirectTo
  })
  if (invErr || !invited?.user) {
    return res.status(400).json({ error: invErr?.message || 'No se pudo enviar la invitación.' })
  }

  try {
    await prisma.user.create({
      data: {
        id: invited.user.id,
        email,
        firstName,
        lastNamePaternal: lastNameP,
        lastNameMaternal: lastNameM,
        rut,
        dob: dob ?? null,
        isPsychologist: false,
        assignedPsychologistId: psychologist.id,
        organizationId: admin.organizationId,
        roles: { create: [{ role: RoleType.PATIENT }] }
      }
    })
  } catch (e: any) {
    await supabaseAdmin.auth.admin.deleteUser(invited.user.id)
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'Email o RUT ya existen.' })
    }
    throw e
  }

  return res.status(201).json({
    ok: true,
    userId: invited.user.id,
    message: 'Invitación enviada.'
  })
}
