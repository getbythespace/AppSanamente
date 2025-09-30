import { prisma } from '@/lib/prisma'

export async function isAssistant(userId: string): Promise<boolean> {
  try {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: userId,
        role: {
          equals: 'ASSISTANT'
        }
      }
    })
    return !!userRole
  } catch (error) {
    console.error('Error checking if user is assistant:', error)
    return false
  }
}

export async function isPsychologist(userId: string): Promise<boolean> {
  try {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: userId,
        role: {
          equals: 'PSYCHOLOGIST'
        }
      }
    })
    return !!userRole
  } catch (error) {
    console.error('Error checking if user is psychologist:', error)
    return false
  }
}

export async function hasAdminRole(userId: string): Promise<boolean> {
  try {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: userId,
        role: {
          in: ['ADMIN', 'OWNER', 'SUPERADMIN']
        }
      }
    })
    return !!userRole
  } catch (error) {
    console.error('Error checking if user has admin role:', error)
    return false
  }
}