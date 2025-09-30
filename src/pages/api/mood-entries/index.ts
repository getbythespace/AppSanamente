import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticateAndAuthorize } from '@/utils/auth-server'
import { prisma } from '@/lib/prisma'
import { subDays, startOfDay, endOfDay } from 'date-fns'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== [MOOD-ENTRIES] MOOD ENTRIES API ===')
  console.log('📋 [MOOD-ENTRIES] Method:', req.method)

  try {
    // AUTH UNIFICADA
    const authResult = await authenticateAndAuthorize(req, res, ['PATIENT', 'PSYCHOLOGIST', 'ADMIN', 'OWNER'])
    
    if ('error' in authResult) {
      console.log('❌ [MOOD-ENTRIES] Auth failed:', authResult.error)
      return res.status(authResult.status).json({ error: authResult.error })
    }

    const user = authResult.user
    console.log('✅ [MOOD-ENTRIES] User authenticated:', { 
      id: user.id, 
      email: user.email, 
      roles: user.roles 
    })

    if (req.method === 'GET') {
      return handleGet(req, res, user)
    }

    if (req.method === 'POST') {
      return handlePost(req, res, user)
    }

    return res.status(405).json({ error: 'Método no permitido' })

  } catch (error: any) {
    console.error('💥 [MOOD-ENTRIES] Error:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, user: any) {
  console.log('📊 [MOOD-ENTRIES] Getting mood entries...')
  
  // Parámetros de consulta
  const patientIdParam = req.query.patientId as string
  const daysParam = req.query.days as string
  const days = daysParam ? parseInt(daysParam) : 30

  // Determinar qué paciente consultar
  let targetPatientId: string

  if (user.roles.includes('PATIENT')) {
    // Los pacientes solo pueden ver sus propios datos
    targetPatientId = user.id
    console.log('👤 [MOOD-ENTRIES] Patient viewing own data')
  } else if (patientIdParam && (user.roles.includes('PSYCHOLOGIST') || user.roles.includes('ADMIN') || user.roles.includes('OWNER'))) {
    // Psicólogos/admins pueden especificar un paciente
    targetPatientId = patientIdParam
    console.log('👨‍⚕️ [MOOD-ENTRIES] Professional viewing patient data:', targetPatientId)
  } else {
    return res.status(400).json({ error: 'ID de paciente requerido' })
  }

  const startDate = subDays(new Date(), days)
  const today = new Date()
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)
  const last7Days = subDays(today, 7)

  console.log('🔍 [MOOD-ENTRIES] Query filters:', { 
    targetPatientId, 
    days, 
    startDate: startDate.toISOString(),
    today: today.toISOString()
  })

  // Obtener entradas del período
  const [moodEntries, todayEntry, last7DaysEntries] = await Promise.all([
    // Todas las entradas del período
    prisma.moodEntry.findMany({
      where: {
        patientId: targetPatientId,
        createdAt: { gte: startDate }
      },
      select: {
        id: true,
        score: true,
        comment: true,
        date: true,
        createdAt: true
      },
      orderBy: { date: 'desc' }
    }),

    // Entrada de hoy
    prisma.moodEntry.findFirst({
      where: {
        patientId: targetPatientId,
        createdAt: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      select: {
        score: true,
        comment: true
      }
    }),

    // Entradas de los últimos 7 días para promedio semanal
    prisma.moodEntry.findMany({
      where: {
        patientId: targetPatientId,
        createdAt: { gte: last7Days }
      },
      select: {
        score: true
      }
    })
  ])

  console.log('✅ [MOOD-ENTRIES] Found entries:', {
    total: moodEntries.length,
    todayEntry: !!todayEntry,
    last7Days: last7DaysEntries.length
  })

  // Calcular promedio semanal
  const avgWeek = last7DaysEntries.length > 0 
    ? last7DaysEntries.reduce((sum, entry) => sum + entry.score, 0) / last7DaysEntries.length
    : 0

  // Formatear items para la respuesta (compatible con el frontend original)
  const items = moodEntries.map(entry => ({
    id: entry.id,
    date: entry.date.toISOString(),
    score: entry.score,
    comment: entry.comment
  }))

  const response = {
    ok: true,
    data: {
      items,
      avgWeek: Math.round(avgWeek * 10) / 10, // Redondear a 1 decimal
      today: todayEntry?.score || null
    }
  }

  console.log('📊 [MOOD-ENTRIES] Response summary:', {
    itemsCount: response.data.items.length,
    avgWeek: response.data.avgWeek,
    todayScore: response.data.today
  })

  return res.json(response)
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, user: any) {
  console.log('➕ [MOOD-ENTRIES] Creating mood entry...')

  // Solo pacientes pueden crear sus propias entradas
  if (!user.roles.includes('PATIENT')) {
    return res.status(403).json({ error: 'Solo los pacientes pueden crear entradas de ánimo' })
  }

  const { score, comment } = req.body

  // Validaciones
  if (!score || typeof score !== 'number' || score < 1 || score > 10) {
    return res.status(400).json({ error: 'Score debe estar entre 1 y 10' })
  }

  console.log('📝 [MOOD-ENTRIES] Creating entry:', { score, comment: !!comment })

  // Verificar si ya existe una entrada para hoy
  const today = new Date()
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)
  
  const existingEntry = await prisma.moodEntry.findFirst({
    where: {
      patientId: user.id,
      createdAt: {
        gte: startOfToday,
        lte: endOfToday
      }
    }
  })

  if (existingEntry) {
    // Actualizar entrada existente
    const updatedEntry = await prisma.moodEntry.update({
      where: { id: existingEntry.id },
      data: {
        score,
        comment: comment || null
      },
      select: {
        id: true,
        score: true,
        comment: true,
        date: true,
        createdAt: true,
        patientId: true
      }
    })

    console.log('🔄 [MOOD-ENTRIES] Entry updated:', updatedEntry.id)

    return res.json({
      ok: true,
      data: {
        id: updatedEntry.id,
        score: updatedEntry.score,
        comment: updatedEntry.comment,
        date: updatedEntry.date.toISOString(),
        message: 'Entrada de ánimo actualizada exitosamente'
      }
    })
  } else {
    // Crear nueva entrada
    const moodEntry = await prisma.moodEntry.create({
      data: {
        patientId: user.id,
        score,
        comment: comment || null,
        date: new Date()
      },
      select: {
        id: true,
        score: true,
        comment: true,
        date: true,
        createdAt: true,
        patientId: true
      }
    })

    console.log('✅ [MOOD-ENTRIES] Entry created:', moodEntry.id)

    return res.json({
      ok: true,
      data: {
        id: moodEntry.id,
        score: moodEntry.score,
        comment: moodEntry.comment,
        date: moodEntry.date.toISOString(),
        message: 'Entrada de ánimo creada exitosamente'
      }
    })
  }
}