import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { supabase } from '../../../services/db'
import { isValidRut } from '../../../utils/validateRut'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No autenticado' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'No autenticado' })

  const { firstName, lastNameP, lastNameM, rut, dob, orgRut, registerType } = req.body

  // Validar formato de RUT
  if (!isValidRut(rut)) {
    return res.status(400).json({ error: 'RUT inválido. Debe tener formato 12.345.678-9' })
  }

  // Validar unicidad de RUT
  const rutExists = await prisma.user.findFirst({ where: { rut } })
  if (rutExists && rutExists.id !== user.id) {
    return res.status(400).json({ error: 'Ya existe un usuario registrado con este RUT.' })
  }

  // Validar mayoría de edad si es psicólogo
  if (registerType === 'psychologist') {
    if (!dob) return res.status(400).json({ error: 'Debes ingresar fecha de nacimiento.' })
    const edad = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (edad < 18) {
      return res.status(400).json({ error: 'Debes ser mayor de edad para registrarte como psicólogo.' })
    }
  }

  // Validar RUT de organización si corresponde
  if (registerType === 'organization' && orgRut) {
    if (!isValidRut(orgRut)) {
      return res.status(400).json({ error: 'RUT de organización inválido. Debe tener formato 12.345.678-9' })
    }
    // Validar unicidad de RUT de organización
    const orgRutExists = await prisma.organization.findFirst({ where: { rut: orgRut } })
    if (orgRutExists) {
      return res.status(400).json({ error: 'Ya existe una organización registrada con este RUT.' })
    }
  }

  // Crea o actualiza el usuario en tu base de datos
  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    update: { firstName, lastNamePaternal: lastNameP, lastNameMaternal: lastNameM, rut, dob },
    create: { id: user.id, firstName, lastNamePaternal: lastNameP, lastNameMaternal: lastNameM, rut, dob }
  })
}