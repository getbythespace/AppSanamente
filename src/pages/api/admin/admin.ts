import type { NextApiRequest, NextApiResponse } from 'next';
import { withUser, requireRole } from '../_utils';
import { prisma } from 'src/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withUser(req, res, async user => {
    requireRole(user, ['ADMIN']);

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
  });
}