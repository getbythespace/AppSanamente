import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../../../utils/requireRole';
import { prisma } from 'src/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await requireRole(req, ['ADMIN']);

    if (req.method === 'GET') {
      const list = await prisma.user.findMany({ where: { organizationId: user.organizationId } });
      return res.json(list);
    }

    if (req.method === 'POST') {
      const data = req.body;
      const u = await prisma.user.create({ data });
      return res.status(201).json(u);
    }

    res.setHeader('Allow',['GET','POST']);
    res.status(405).end();
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
}