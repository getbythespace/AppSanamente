import type { NextApiRequest, NextApiResponse } from 'next';
import { withUser, requireRole } from '../_utils';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withUser(req, res, async user => {
    requireRole(user, ['ADMIN']);

    if (req.method === 'GET') {
      const list = await prisma.organization.findMany();
      return res.json(list);
    }
    if (req.method === 'POST') {
      const { name, rut } = req.body;
      const org = await prisma.organization.create({ data: { name, rut } });
      return res.status(201).json(org);
    }
    res.setHeader('Allow', ['GET','POST']);
    res.status(405).end();
  });
}

export const placeholderOrganizationFunction = () => {
  console.log("Organization module placeholder");
};