
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';
import { prisma } from '@/lib/prisma';
import type { AppRole } from '@/types/roles';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Ctx = { userId: string; roles: AppRole[]; prisma: typeof prisma };

export function withApi(
  allowed: Method[],
  requiredRoles: AppRole[] | 'ANY' | undefined,
  fn: (req: NextApiRequest, res: NextApiResponse, ctx: Ctx) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (!allowed.includes(req.method as Method)) {
      return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    }

    const supabase = supabaseServer(req, res);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });

    
    const ra: { role: string }[] = await prisma.userRole.findMany({
      where: { userId: user.id },
      select: { role: true }
    });
    const roles: AppRole[] = ra.map((r: { role: string }) => r.role as AppRole);

    if (requiredRoles && requiredRoles !== 'ANY') {
      const isAllowed = roles.some((r: AppRole) => (requiredRoles as AppRole[]).includes(r));
      if (!isAllowed) return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }

    try {
      await fn(req, res, { userId: user.id, roles, prisma });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ ok: false, error: 'INTERNAL', message: e?.message ?? 'Error' });
    }
  };
}
