import type { NextApiResponse } from 'next';
import type { AuthedRequest } from '@/utils/requireRole';
import { withRole } from '@/utils/requireRole';
import { prisma } from '@/lib/prisma';

export default withRole(['ADMIN','OWNER','SUPERADMIN'], async (req: AuthedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') return res.status(405).end();
  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'id requerido' });

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: true,
      organization: { select: { id: true, name: true, plan: true } }
    }
  });
  if (!user) return res.status(404).json({ error: 'No encontrado' });

  return res.status(200).json({ user });
});
