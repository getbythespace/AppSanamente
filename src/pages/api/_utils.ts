import { getAuth } from '@clerk/nextjs/server'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'

export async function withUser(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (user: any) => Promise<void | NextApiResponse<any>>
) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Devolvemos lo que retorne el callback (void o NextApiResponse)
  return handler(user);
}

export function requireRole(user: any, roles: string[]) {
  if (!roles.includes(user.role)) {
    throw { status: 403, message: 'Forbidden' };
  }
}