import { getAuth } from '@clerk/nextjs/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'src/lib/prisma';

export async function withUser(
  req: NextApiRequest, res: NextApiResponse,
  handler: (user: any) => Promise<void>
) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).end();
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return res.status(403).end();
  return handler(user);
}

export function requireRole(user: any, roles: string[]) {
  if (!roles.includes(user.role)) throw { status: 403, message: 'Forbidden' };
}