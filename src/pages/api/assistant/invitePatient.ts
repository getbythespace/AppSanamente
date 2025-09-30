import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/services/supabaseAdmin'
import { withRole } from '@/utils/withRole'
import { getSessionUser } from '@/utils/auth-server'

const BodySchema = z.object({
  email: z.string().email(),
  rut: z.string().min(3),
  firstName: z.string().min(1),
  lastNamePaternal: z.string().min(1),
  lastNameMaternal: z.string().optional().default(''),
  dob: z.string().optional(),              // ISO yyyy-mm-dd
  targetPsychologistId: z.string().optional(), // ⚠️ ahora OPCIONAL de verdad
})

// arma un absolute URL para redirect
function getBaseUrl(req: NextApiRequest) {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL
  if (env) return env.replace(/\/+$/, '')
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http'
  const host = req.headers.host
  return `${proto}://${host}`
}

export default withRole(['ASSISTANT'], async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ ok: false, error: 'No autenticado' })
  const orgId = sessionUser.organizationId
  if (!orgId) return res.status(400).json({ ok: false, error: 'El asistente no pertenece a ninguna organización' })

  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => i.message).join(', ')
    return res.status(400).json({ ok: false, error: msg })
  }

  const {
    email, rut, firstName, lastNamePaternal, lastNameMaternal, dob, targetPsychologistId,
  } = parsed.data

  try {
    // Duplicados básicos
    const [dupByEmail, dupByRut] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { rut } }).catch(() => null),
    ])
    if (dupByEmail) return res.status(400).json({ ok: false, error: 'El email ya está registrado' })
    if (dupByRut)   return res.status(400).json({ ok: false, error: 'El RUT ya está registrado' })

    // 🚫 Ya NO obligamos a elegir psicólogo; si llega, lo validamos y lo guardamos,
    // pero la asignación efectiva se hará al activar la cuenta (complete-invite).
    let psychologistId: string | null = null
    if (targetPsychologistId) {
      const psy = await prisma.user.findFirst({
        where: {
          id: targetPsychologistId,
          organizationId: orgId,
          roles: { some: { role: 'PSYCHOLOGIST' } },
          status: 'ACTIVE',
        },
        select: { id: true },
      })
      if (!psy) return res.status(400).json({ ok: false, error: 'El psicólogo indicado no es válido para tu organización' })
      psychologistId = targetPsychologistId
    }

    // 1) Invitar por Supabase con redirect a /auth/set-password
    const redirectTo = `${getBaseUrl(req)}/auth/set-password`
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          firstName, lastNamePaternal, lastNameMaternal,
          rut, dob: dob || null,
          organizationId: orgId,
          assignedPsychologistId: psychologistId, // puede ser null
          current_role: 'PATIENT',
        },
        redirectTo,
      })

    if (inviteError) {
      console.error('Supabase invite error:', inviteError)
      return res.status(400).json({ ok: false, error: inviteError.message || 'No se pudo enviar la invitación' })
    }

    const supabaseUserId = inviteData?.user?.id

    // 2) Inserción local (status PENDING)
    const created = await prisma.user.create({
      data: {
        ...(supabaseUserId ? { id: supabaseUserId } : {}),
        email,
        rut,
        firstName,
        lastNamePaternal,
        lastNameMaternal: lastNameMaternal || '',
        dob: dob ? new Date(dob) : null,
        isPsychologist: false,
        organizationId: orgId,
        assignedPsychologistId: psychologistId, // se usará en /auth/complete-invite
        status: 'PENDING',
        roles: { create: [{ role: 'PATIENT' }] },
      },
      select: { id: true }
    })

    return res.status(200).json({ ok: true, data: { invitationId: supabaseUserId, userId: created.id } })
  } catch (e: any) {
    console.error('assistant/invitePatient error:', e)
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})
