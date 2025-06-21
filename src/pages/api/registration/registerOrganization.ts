import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { RoleType } from '@prisma/client'
import { createClerkUser } from '../../../utils/clerkApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { orgName, orgRut, firstName, lastNameP, lastNameM, rut, dob, email, password, isPsychologist } = req.body

    // 1. Crear usuario en Clerk
    const clerkUser = await createClerkUser({
      email,
      password,
      firstName,
      lastName: `${lastNameP} ${lastNameM}`,
    })

    // 2. Crear organización
    const org = await prisma.organization.create({
      data: { name: orgName, rut: orgRut }
    })

    // 3. Prepara los roles usando el enum RoleType
    const roles: { role: RoleType }[] = [{ role: RoleType.ADMIN }]
    if (isPsychologist) roles.push({ role: RoleType.PSYCHOLOGIST })

    // 4. Crear usuario en tu base de datos con clerkUserId y roles correctos
    const user = await prisma.user.create({
      data: {
        clerkUserId: clerkUser.id,
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
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}