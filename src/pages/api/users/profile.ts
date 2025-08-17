import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { supabase } from '../../../lib/db'
import { isValidRut } from '../../../utils/validateRut'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  //Autenticación (token JWT de Supabase)
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No autenticado' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'No autenticado' })

  //Desestructurar body y validar datos mínimos
  const { firstName, lastNameP, lastNameM, rut, dob, orgRut, registerType } = req.body

  //Validación básica de campos obligatorios
  if (!firstName || !lastNameP || !lastNameM || !rut) {
    return res.status(400).json({ error: 'Faltan datos obligatorios.' })
  }

  if (!user.email) {
    return res.status(400).json({ error: 'El usuario autenticado no tiene email.' })
  }

  //RUT válido
  if (!isValidRut(rut)) {
    return res.status(400).json({ error: 'RUT inválido. Debe tener formato 12.345.678-9' })
  }

  //RUT único
  const rutExists = await prisma.user.findFirst({ where: { rut } })
  if (rutExists && rutExists.id !== user.id) {
    return res.status(400).json({ error: 'Ya existe un usuario registrado con este RUT.' })
  }

  //Psicólogo mayor de edad
  if (registerType === 'psychologist') {
    if (!dob) return res.status(400).json({ error: 'Debes ingresar fecha de nacimiento.' })
    const edad = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (edad < 18) {
      return res.status(400).json({ error: 'Debes ser mayor de edad para registrarte como psicólogo.' })
    }
  }

  //Organización RUT válido y único
  if (registerType === 'organization' && orgRut) {
    if (!isValidRut(orgRut)) {
      return res.status(400).json({ error: 'RUT de organización inválido. Debe tener formato 12.345.678-9' })
    }
    const orgRutExists = await prisma.organization.findFirst({ where: { rut: orgRut } })
    if (orgRutExists) {
      return res.status(400).json({ error: 'Ya existe una organización registrada con este RUT.' })
    }
  }

  //Upsert: crear o actualizar usuario en la BD
  try {
    const dbUser = await prisma.user.upsert({
      where: { id: user.id },
      update: { 
        firstName, 
        lastNamePaternal: lastNameP, 
        lastNameMaternal: lastNameM, 
        rut, 
        dob
      },
      create: { 
        id: user.id,
        email: user.email, // Obligatorio para crear
        firstName,
        lastNamePaternal: lastNameP,
        lastNameMaternal: lastNameM,
        rut,
        dob
      }
    })

    return res.status(200).json({ ok: true, user: dbUser })

  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(err)
    }
    //Prisma validation error
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'El email o RUT ya existen en la base de datos.' })
    }
    return res.status(500).json({ error: err.message || 'Error inesperado en la base de datos.' })
  }
}
