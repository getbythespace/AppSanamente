import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { RoleType } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { orgName, orgRut, firstName, lastNameP, lastNameM, rut, dob, email, password, isPsychologist } = req.body

//Crear usuario en Supabase Auth
const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: false, 
})


if (authError || !authUser?.user) {
  return res.status(400).json({ error: authError?.message || 'No se pudo crear el usuario en Supabase Auth' })
}

// Enviar correo de confirmación manualmente y manejar error
const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)
if (inviteError) {
  console.error('Error enviando invitación:', inviteError)
  return res.status(400).json({ error: inviteError.message })
}



//Crear organización
const org = await prisma.organization.create({
  data: { name: orgName, rut: orgRut }
})

//Prepara los roles usando el enum RoleType
const roles: { role: RoleType }[] = [{ role: RoleType.ADMIN }]
if (isPsychologist) roles.push({ role: RoleType.PSYCHOLOGIST })

//Crear usuario en tu base de datos con el id de Supabase Auth
const user = await prisma.user.create({
  data: {
    id: authUser.user.id, // id supabase como id principal
    rut,
    firstName,
    lastNamePaternal: lastNameP,
    lastNameMaternal: lastNameM,
    dob,
    organizationId: org.id,
    roles: { create: roles }
  }
})

res.status(201).json({ user, org })
} catch (error) {
  console.error('Error en el registro de organización:', error)
  res.status(400).json({ error: 'Error al registrar la organización o el usuario' })
}
}