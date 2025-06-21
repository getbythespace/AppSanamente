import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { RoleType } from '@prisma/client'
import { createClerkUser } from '../../../utils/clerkApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { firstName, lastNameP, lastNameM, rut, dob, email, password } = req.body

    // 1. Crear usuario en Clerk
    const clerkUser = await createClerkUser({
      email,
      password,
      firstName,
      lastName: `${lastNameP} ${lastNameM}`,
    })

    // 2. Crear organización interna
    const org = await prisma.organization.create({
      data: {
        name: `${firstName} ${lastNameP}`,
        rut: rut + '-ORG'
      }
    })

    // 3. Crear usuario en tu base de datos con clerkUserId y roles correctos
    const user = await prisma.user.create({
      data: {
        clerkUserId: clerkUser.id,
        rut,
        firstName,
        lastNamePaternal: lastNameP,
        lastNameMaternal: lastNameM,
        dob,
        organizationId: org.id,
        roles: {
          create: [
            { role: RoleType.ADMIN },
            { role: RoleType.PSYCHOLOGIST }
          ]
        }
      }
    })

    res.status(201).json({ user, org })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}