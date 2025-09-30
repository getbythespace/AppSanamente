import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticateAndAuthorize } from '@/utils/auth-server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subDays } from 'date-fns'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    console.log('=== [PATIENT-OVERVIEW] PATIENT OVERVIEW API ===')
    
    // AUTH UNIFICADA - Solo pacientes pueden ver su propio overview
    const authResult = await authenticateAndAuthorize(req, res, ['PATIENT'])
    
    if ('error' in authResult) {
      console.log('❌ [PATIENT-OVERVIEW] Auth failed:', authResult.error)
      return res.status(authResult.status).json({ error: authResult.error })
    }

    const user = authResult.user
    console.log('✅ [PATIENT-OVERVIEW] Patient authenticated:', { 
      id: user.id, 
      email: user.email, 
      roles: user.roles 
    })

    const patientId = user.id
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)
    const last7Days = subDays(now, 7)
    const last30Days = subDays(now, 30)

    console.log('📅 [PATIENT-OVERVIEW] Date ranges:', {
      currentMonth: { start: startOfCurrentMonth, end: endOfCurrentMonth },
      last7Days,
      last30Days
    })

    // OBTENER DATOS DEL PACIENTE
    const [
      patientInfo,
      totalMoodEntries,
      moodEntriesThisMonth,
      moodEntriesLast7Days,
      recentMoodEntries,
      averageMoodLast30Days,
      sessionNotes,
      activeAssignments,
      diagnoses
    ] = await Promise.all([
      // Información básica del paciente
      prisma.user.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastNamePaternal: true,
          lastNameMaternal: true,
          createdAt: true,
          organizationId: true
        }
      }),

      // Total entradas de ánimo
      prisma.moodEntry.count({
        where: { patientId }
      }),

      // Entradas este mes
      prisma.moodEntry.count({
        where: {
          patientId,
          createdAt: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        }
      }),

      // Entradas últimos 7 días
      prisma.moodEntry.count({
        where: {
          patientId,
          createdAt: { gte: last7Days }
        }
      }),

      // Entradas recientes para el gráfico
      prisma.moodEntry.findMany({
        where: {
          patientId,
          createdAt: { gte: last30Days }
        },
        select: {
          id: true,
          score: true,
          comment: true,
          date: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),

      // Promedio de ánimo últimos 30 días
      prisma.moodEntry.aggregate({
        where: {
          patientId,
          createdAt: { gte: last30Days }
        },
        _avg: { score: true },
        _count: { id: true }
      }),

      // Notas de sesión
      prisma.sessionNote.count({
        where: { patientId }
      }),

      // Asignaciones activas
      prisma.patientAssignment.count({
        where: {
          patientId,
          status: 'ACTIVE'
        }
      }),

      // Diagnósticos
      prisma.diagnosis.count({
        where: { patientId }
      })
    ])

    if (!patientInfo) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }

    console.log('📊 [PATIENT-OVERVIEW] Raw data:', {
      totalMoodEntries,
      moodEntriesThisMonth,
      moodEntriesLast7Days,
      recentMoodEntries: recentMoodEntries.length,
      averageMood: averageMoodLast30Days._avg?.score,
      sessionNotes,
      activeAssignments,
      diagnoses
    })

    // PROCESAR DATOS PARA EL GRÁFICO
    const moodData = recentMoodEntries.map(entry => ({
      date: entry.date.toISOString().split('T')[0], // YYYY-MM-DD
      score: entry.score || 5,
      comment: entry.comment,
      timestamp: entry.createdAt
    }))

    // AGRUPAR POR DÍA Y PROMEDIAR
    const moodByDay = moodData.reduce((acc, entry) => {
      const date = entry.date
      if (!acc[date]) {
        acc[date] = { total: 0, count: 0, comments: [] }
      }
      acc[date].total += entry.score
      acc[date].count += 1
      if (entry.comment) {
        acc[date].comments.push(entry.comment)
      }
      return acc
    }, {} as Record<string, { total: number, count: number, comments: string[] }>)

    const chartData = Object.entries(moodByDay)
      .map(([date, data]) => ({
        date,
        score: Math.round((data.total / data.count) * 10) / 10, // Redondear a 1 decimal
        entries: data.count,
        comments: data.comments
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // CALCULAR TENDENCIAS
    const currentAvg = averageMoodLast30Days._avg?.score || 5
    const weeklyEntries = moodEntriesLast7Days
    const monthlyEntries = moodEntriesThisMonth

    // CALCULAR STREAKS
    const sortedEntries = recentMoodEntries.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    let currentStreak = 0
    let checkDate = new Date()
    
    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const hasEntryThisDay = sortedEntries.some(entry => 
        entry.date.toISOString().split('T')[0] === dateStr
      )
      
      if (hasEntryThisDay) {
        currentStreak++
      } else {
        break
      }
      
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // MAPEAR SCORE A MOOD DESCRIPTIVO
    const getScoreMood = (score: number) => {
      if (score >= 8) return 'Muy bien'
      if (score >= 6) return 'Bien'
      if (score >= 4) return 'Regular'
      if (score >= 2) return 'Mal'
      return 'Muy mal'
    }

    const overview = {
      patient: {
        id: patientInfo.id,
        name: `${patientInfo.firstName} ${patientInfo.lastNamePaternal}`.trim(),
        email: patientInfo.email,
        memberSince: patientInfo.createdAt,
        organizationId: patientInfo.organizationId
      },
      stats: {
        totalMoodEntries,
        moodEntriesThisMonth,
        moodEntriesLast7Days,
        sessionNotes,
        activeAssignments,
        diagnoses,
        currentStreak
      },
      mood: {
        averageLast30Days: Math.round(currentAvg * 10) / 10,
        totalEntriesLast30Days: averageMoodLast30Days._count?.id || 0,
        chartData,
        latestEntry: recentMoodEntries[0] ? {
          mood: getScoreMood(recentMoodEntries[0].score),
          score: recentMoodEntries[0].score,
          createdAt: recentMoodEntries[0].createdAt,
          comment: recentMoodEntries[0].comment
        } : null
      },
      trends: {
        weeklyActivity: weeklyEntries,
        monthlyActivity: monthlyEntries,
        moodTrend: currentAvg >= 6 ? 'positive' : currentAvg >= 4 ? 'neutral' : 'concerning'
      },
      lastUpdated: new Date().toISOString()
    }

    console.log('✅ [PATIENT-OVERVIEW] Overview compiled:', {
      patientName: overview.patient.name,
      totalEntries: overview.stats.totalMoodEntries,
      averageMood: overview.mood.averageLast30Days,
      currentStreak: overview.stats.currentStreak,
      chartDataPoints: overview.mood.chartData.length
    })

    return res.json({
      success: true,
      overview,
      debug: {
        patientId,
        organizationId: patientInfo.organizationId,
        dateRanges: {
          last7Days: last7Days.toISOString(),
          last30Days: last30Days.toISOString(),
          currentMonth: {
            start: startOfCurrentMonth.toISOString(),
            end: endOfCurrentMonth.toISOString()
          }
        }
      }
    })

  } catch (error: any) {
    console.error('💥 [PATIENT-OVERVIEW] Error getting patient overview:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}