import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

type Role = 'SUPERADMIN' | 'ADMIN' | 'ASSISTANT' | 'PSYCHOLOGIST' | 'PATIENT' | 'OWNER';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface AuthedRequest extends NextApiRequest {
  auth?: {
    userId: string;
    roles: Role[];
    organizationId?: string | null;
  };
}

export function withRole(roles: Role[], handler: NextApiHandler) {
  return async (req: AuthedRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
      if (!token) return res.status(401).json({ error: 'Missing bearer token' });

      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

      const user = await prisma.user.findUnique({
        where: { id: data.user.id },
        select: {
          id: true,
          organizationId: true,
          roles: { select: { role: true } }
        }
      });

      if (!user) return res.status(401).json({ error: 'User not found' });

      const userRoles = user.roles.map(r => r.role as Role);
      const allowed = roles.some(r => userRoles.includes(r));
      if (!allowed) return res.status(403).json({ error: 'No autorizado' });

      req.auth = { userId: user.id, roles: userRoles, organizationId: user.organizationId };
      return handler(req, res);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Auth error' });
    }
  };
}

// 👇 alias para compatibilidad
export const requireRole = withRole;
export default withRole;
