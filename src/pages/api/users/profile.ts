import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { supabase } from '../../../services/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No autenticado' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'No autenticado' })

  const { firstName, lastNameP, lastNameM, rut, dob } = req.body

  // Crea o actualiza el usuario en tu base de datos
  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    update: { firstName, lastNamePaternal: lastNameP, lastNameMaternal: lastNameM, rut, dob },
    create: { id: user.id, firstName, lastNamePaternal: lastNameP, lastNameMaternal: lastNameM, rut, dob }
  })

  res.json(dbUser)
}