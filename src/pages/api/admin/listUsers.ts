import type { NextApiResponse } from 'next';
import type { AuthedRequest } from '@/utils/requireRole';
import { withRole } from '@/utils/requireRole';
import { prisma } from '@/lib/prisma';

export default withRole(['ADMIN','OWNER','SUPERADMIN'], async (req: AuthedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') return res.status(405).end();

  // SUPERADMIN: listar todos
  if (req.auth?.roles.includes('SUPERADMIN') && req.query.scope === 'all') {
    const users = await prisma.user.findMany({
      include: {
        roles: true,
        organization: { select: { id: true, name: true, plan: true } }
      }
    });
    return res.status(200).json({ users });
  }

  const orgId = req.auth?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'Sin organización asociada.' });

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    include: { roles: true }
  });
  return res.status(200).json({ users });
});
