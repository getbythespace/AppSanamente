import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticateAndAuthorize } from '@/utils/auth-server'
import { prisma } from '@/lib/prisma'

interface ExecutiveMetrics {
  users: {
    total: number
    active: number
    patients: number
    psychologists: number
    admins: number
  }
  clinical: {
    sessionNotes: number
    recentSessions: number
    moodEntries: number
    activeAssignments: number
    diagnoses: number
  }
  growth: {
    usersThisMonth: number
    sessionsThisMonth: number
  }
  engagement: {
    responseRate: number
    averageSessionsPerPatient: number
    activePsychologists: number
    patientsActiveThisWeek: number
    patientsActiveThisMonth: number
    patientsNeverActive: number
  }
  lastUpdated: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🎯 [EXEC-METRICS] === EXECUTIVE METRICS API CALLED ===')
  console.log('📋 [EXEC-METRICS] Method:', req.method)
  console.log('🍪 [EXEC-METRICS] Has cookies:', !!req.headers.cookie)
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    // AUTH UNIFICADA
    const authResult = await authenticateAndAuthorize(req, res, ['OWNER', 'SUPERADMIN'])
    
    if ('error' in authResult) {
      console.log('❌ [EXEC-METRICS] Auth failed:', authResult.error)
      return res.status(authResult.status).json({ 
        error: authResult.error,
        debug: {
          endpoint: 'executiveMetrics',
          requiredRoles: ['OWNER', 'SUPERADMIN'],
          timestamp: new Date().toISOString()
        }
      })
    }

    const user = authResult.user
    console.log('✅ [EXEC-METRICS] User authorized:', {
      id: user.id,
      email: user.email,
      roles: user.roles,
      organizationId: user.organizationId
    })

    if (!user.organizationId) {
      console.log('❌ [EXEC-METRICS] User has no organization')
      return res.status(400).json({ error: 'Usuario sin organización' })
    }

    console.log('🏢 [EXEC-METRICS] Fetching metrics for organization:', user.organizationId)

    // 📅 FECHAS DE REFERENCIA
    const now = new Date()
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // MÉTRICAS CON MANEJO DE ERRORES INDIVIDUAL
    let metrics: ExecutiveMetrics = {
      users: { total: 0, active: 0, patients: 0, psychologists: 0, admins: 0 },
      clinical: { sessionNotes: 0, recentSessions: 0, moodEntries: 0, activeAssignments: 0, diagnoses: 0 },
      growth: { usersThisMonth: 0, sessionsThisMonth: 0 },
      engagement: { 
        responseRate: 0, 
        averageSessionsPerPatient: 0, 
        activePsychologists: 0, 
        patientsActiveThisWeek: 0, 
        patientsActiveThisMonth: 0, 
        patientsNeverActive: 0 
      },
      lastUpdated: new Date().toISOString()
    }

    // MÉTRICAS DE USUARIOS - CORREGIDAS SEGÚN SCHEMA
    try {
      console.log('📊 [EXEC-METRICS] Calculating user metrics...')
      
      const [totalUsers, activeUsers, totalPatients, totalPsychologists, totalAdmins] = await Promise.all([
        // Total usuarios
        prisma.user.count({
          where: { organizationId: user.organizationId }
        }),
        
        // Usuarios activos
        prisma.user.count({
          where: { 
            organizationId: user.organizationId,
            status: 'ACTIVE'
          }
        }),
        
        // Total pacientes
        prisma.user.count({
          where: { 
            organizationId: user.organizationId,
            roles: {
              some: { role: 'PATIENT' }
            }
          }
        }),
        
        // Total psicólogos (usando isPsychologist field)
        prisma.user.count({
          where: { 
            organizationId: user.organizationId,
            isPsychologist: true
          }
        }),
        
        // Total admins/owners
        prisma.user.count({
          where: { 
            organizationId: user.organizationId,
            roles: {
              some: { role: { in: ['ADMIN', 'OWNER'] } }
            }
          }
        })
      ])

      metrics.users = {
        total: totalUsers,
        active: activeUsers,
        patients: totalPatients,
        psychologists: totalPsychologists,
        admins: totalAdmins
      }

      console.log('👥 [EXEC-METRICS] User metrics:', metrics.users)

    } catch (userError) {
      console.log('❌ [EXEC-METRICS] Error calculating user metrics:', userError)
    }

    // MÉTRICAS CLÍNICAS - CORREGIDAS SEGÚN SCHEMA
    try {
      console.log('🏥 [EXEC-METRICS] Calculating clinical metrics...')
      
      const [totalSessionNotes, recentSessionNotes, totalMoodEntries, activeAssignments, totalDiagnoses] = await Promise.all([
        // Total notas de sesión (usando relación patient)
        prisma.sessionNote.count({
          where: {
            patient: { organizationId: user.organizationId }
          }
        }),
        
        // Notas recientes (últimos 30 días)
        prisma.sessionNote.count({
          where: {
            patient: { organizationId: user.organizationId },
            createdAt: {
              gte: last30Days
            }
          }
        }),
        
        // Total entradas de ánimo (usando relación patient en MoodEntry)
        prisma.moodEntry.count({
          where: {
            patient: { organizationId: user.organizationId }
          }
        }),
        
        // Asignaciones activas (usando PatientAssignment)
        prisma.patientAssignment.count({
          where: {
            organizationId: user.organizationId,
            status: 'ACTIVE'
          }
        }),
        
        // Total diagnósticos
        prisma.diagnosis.count({
          where: {
            patient: { organizationId: user.organizationId }
          }
        })
      ])

      metrics.clinical = {
        sessionNotes: totalSessionNotes,
        recentSessions: recentSessionNotes,
        moodEntries: totalMoodEntries,
        activeAssignments: activeAssignments,
        diagnoses: totalDiagnoses
      }

      console.log('🏥 [EXEC-METRICS] Clinical metrics:', metrics.clinical)

    } catch (clinicalError) {
      console.log('❌ [EXEC-METRICS] Error calculating clinical metrics:', clinicalError)
    }

    // 🎯 MÉTRICAS DE ENGAGEMENT - CORREGIDAS SEGÚN SCHEMA
    try {
      console.log('🎯 [EXEC-METRICS] Calculating engagement metrics...')
      
      const [
        patientsActiveThisWeek,
        patientsActiveThisMonth,
        patientsWithAnyMoodEntry,
        psychologistsWithActiveSessions
      ] = await Promise.all([
        // Pacientes activos esta semana (con entradas de ánimo)
        prisma.user.count({
          where: {
            organizationId: user.organizationId,
            roles: { some: { role: 'PATIENT' } },
            moodEntries: {
              some: {
                createdAt: { gte: last7Days }
              }
            }
          }
        }),
        
        // Pacientes activos este mes
        prisma.user.count({
          where: {
            organizationId: user.organizationId,
            roles: { some: { role: 'PATIENT' } },
            moodEntries: {
              some: {
                createdAt: { gte: last30Days }
              }
            }
          }
        }),
        
        // Pacientes que han registrado ánimo alguna vez
        prisma.user.count({
          where: {
            organizationId: user.organizationId,
            roles: { some: { role: 'PATIENT' } },
            moodEntries: { some: {} }
          }
        }),
        
        // ✅ CORREGIDO: Psicólogos con sesiones en los últimos 30 días
        // Usando sessionNotesAsPsychologist en lugar de sessionNotes
        prisma.user.count({
          where: {
            organizationId: user.organizationId,
            isPsychologist: true,
            sessionNotesAsPsychologist: {
              some: {
                createdAt: { gte: last30Days }
              }
            }
          }
        })
      ])

      // Cálculos de engagement
      const patientsNeverActive = metrics.users.patients - patientsWithAnyMoodEntry
      const responseRateWeek = metrics.users.patients > 0 
        ? Math.round((patientsActiveThisWeek / metrics.users.patients) * 100) 
        : 0
      const averageSessionsPerPatient = metrics.users.patients > 0 
        ? Math.round((metrics.clinical.sessionNotes / metrics.users.patients) * 10) / 10 
        : 0

      metrics.engagement = {
        responseRate: responseRateWeek,
        averageSessionsPerPatient: averageSessionsPerPatient,
        activePsychologists: psychologistsWithActiveSessions,
        patientsActiveThisWeek: patientsActiveThisWeek,
        patientsActiveThisMonth: patientsActiveThisMonth,
        patientsNeverActive: patientsNeverActive
      }

      console.log('🎯 [EXEC-METRICS] Engagement metrics:', metrics.engagement)

    } catch (engagementError) {
      console.log('❌ [EXEC-METRICS] Error calculating engagement metrics:', engagementError)
    }

    // MÉTRICAS DE CRECIMIENTO
    try {
      console.log('📈 [EXEC-METRICS] Calculating growth metrics...')
      
      const usersThisMonth = await prisma.user.count({
        where: {
          organizationId: user.organizationId,
          createdAt: {
            gte: startOfMonth
          }
        }
      })

      const sessionsThisMonth = await prisma.sessionNote.count({
        where: {
          patient: { organizationId: user.organizationId },
          createdAt: {
            gte: startOfMonth
          }
        }
      })
      
      metrics.growth = {
        usersThisMonth: usersThisMonth,
        sessionsThisMonth: sessionsThisMonth
      }

      console.log('📈 [EXEC-METRICS] Growth metrics:', metrics.growth)
    } catch (growthError) {
      console.log('❌ [EXEC-METRICS] Error calculating growth metrics:', growthError)
    }

    console.log('📊 [EXEC-METRICS] Final metrics calculated:', metrics)

    return res.json({
      success: true,
      metrics,
      debug: {
        userId: user.id,
        userEmail: user.email,
        userRoles: user.roles,
        organizationId: user.organizationId,
        totalPatients: metrics.users.patients,
        patientsActiveThisWeek: metrics.engagement.patientsActiveThisWeek,
        patientsActiveThisMonth: metrics.engagement.patientsActiveThisMonth,
        patientsNeverActive: metrics.engagement.patientsNeverActive,
        responseRateWeek: metrics.engagement.responseRate,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('💥 [EXEC-METRICS] Error obteniendo métricas ejecutivas:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}