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

const assistantSchema = z.object({
  firstName: z.string().min(2),
  lastNameP: z.string().min(2),
  lastNameM: z.string().min(2),
  rut: z.string().regex(/^\d{7,8}-[0-9kK]$/, 'RUT inválido (ej: 12345678-9).'),
  email: z.string().email(),
  dob: z.string()
  //ORGNIZATION ID (?)
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  //Validación de admin y organización
  const admin = await getSessionUser(req, res)
  if (!admin || !admin.roles.some((r: any) => r.role === 'ADMIN')) {
    return res.status(403).json({ error: 'Solo administradores pueden invitar asistentes.' })
  }
  const organizationId = admin.organizationId
  if (!organizationId) {
    return res.status(400).json({ error: 'No tienes organización asociada.' })
  }

  // Validar datos
  const parseResult = assistantSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0].message })
  }
  const { firstName, lastNameP, lastNameM, rut, email, dob } = parseResult.data

  //Validar que la organización existe
  const org = await prisma.organization.findUnique({ where: { id: organizationId } })
  if (!org) {
    return res.status(400).json({ error: 'ID de organización inválido' })
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
        isPsychologist: false,
        roles: [RoleType.ASSISTANT],
        organizationId
      },
      redirectTo: "http://localhost:3000/auth/set-password"
    });

    if (authError || !authUser?.user) {
      return res.status(400).json({ error: authError?.message || 'Error creando usuario en Supabase Auth' })
    }

    const supabaseUserId = authUser.user.id;

    await prisma.user.create({
      data: {
        id: supabaseUserId,
        email,
        firstName,
        lastNamePaternal: lastNameP,
        lastNameMaternal: lastNameM,
        rut,
        dob: new Date(dob),
        isPsychologist: false,
        organizationId,
        roles: { create: [{ role: RoleType.ASSISTANT }] }
      }
    });

    res.status(201).json({ ok: true, message: 'Asistente creado. Revisa tu correo para confirmar cuenta.' });

  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error inesperado' })
  }
}
