import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../../../utils/requireRole';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await requireRole(req, ['ADMIN']);

    if (req.method === 'GET') {
      //Solo puede ver su organización
      if (!user.organizationId) {
        return res.status(404).json({ error: 'No perteneces a ninguna organización.' });
      }
      const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
      return res.json(org);
    }
    if (req.method === 'POST') {
      const { name, rut } = req.body;
      //Solo puede crear organización si no tiene una
      if (user.organizationId) {
        return res.status(403).json({ error: 'Ya perteneces a una organización.' });
      }
      const org = await prisma.organization.create({ data: { name, rut } });
      return res.status(201).json(org);
    }
    res.setHeader('Allow', ['GET','POST']);
    res.status(405).end();
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
}