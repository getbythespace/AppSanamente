import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { RoleType } from '@prisma/client'
import { getSessionUser } from '@/utils/auth-server'
import { canInviteAssistant } from '@/utils/permissions'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const normalizeRut = (rut: string) =>
  rut.trim().replace(/\./g, '').replace(/\s/g, '').toUpperCase()

const schema = z.object({
  firstName: z.string().min(2),
  lastNameP: z.string().min(2),
  lastNameM: z.string().min(2),
  rut: z.string()
    .transform(normalizeRut)
    .refine(v => /^\d{7,8}-[0-9K]$/.test(v), 'RUT inválido (ej: 12.345.678-5).'),
  email: z.string().email(),
  dob: z.coerce.date().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 1) Auth 
  const admin = await getSessionUser(req, res)
  if (!admin) return res.status(401).json({ error: 'No autenticado' })

  // 2) Permisos (bloquea plan SOLO y exige OWNER/ADMIN/SUPERADMIN)
  if (!canInviteAssistant(admin)) {
    return res.status(403).json({ error: 'No tienes permisos para invitar asistentes.' })
  }
  if (!admin.organizationId) {
    return res.status(400).json({ error: 'No tienes organización asociada.' })
  }

  // 3) Validación payload
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.issues[0].message })
  }
  const { firstName, lastNameP, lastNameM, rut, email, dob } = parsed.data

  // 4) setpassword
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
      roles: ['ASSISTANT'],
      organizationId: admin.organizationId
    },
    redirectTo
  })
  if (invErr || !invited?.user) {
    return res.status(400).json({ error: invErr?.message || 'No se pudo enviar la invitación.' })
  }

  // 5) Crear en Prisma
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
        organizationId: admin.organizationId,
        roles: { create: [{ role: RoleType.ASSISTANT }] }
      }
    })
  } catch (e: any) {
    await supabaseAdmin.auth.admin.deleteUser(invited.user.id)
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Email o RUT ya existen.' })
    throw e
  }

  return res.status(201).json({ ok: true, userId: invited.user.id, message: 'Asistente invitado.' })
}
