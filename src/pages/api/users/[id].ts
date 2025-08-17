// src/pages/api/users/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApi } from '@/utils/apiHandler';
import { z } from 'zod';
import type { AppRole } from '@/types/roles';

const StatusEnum = z.enum(['ACTIVE','INACTIVE','PENDING','SUSPENDED','DELETED']);

const bodySchema = z.object({
  firstName: z.string().min(2).optional(),
  lastNamePaternal: z.string().min(2).optional(),
  lastNameMaternal: z.string().min(2).optional(),
  rut: z.string().min(5).optional(),
  status: StatusEnum.optional(),
  organizationId: z.string().cuid().optional()
});

export default withApi(['PATCH'], ['ADMIN','SUPERADMIN'] as AppRole[], async (req: NextApiRequest, res: NextApiResponse, { prisma }) => {
  const id = req.query.id as string;
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'VALIDATION', issues: parsed.error.issues });

  const user = await prisma.user.update({ where: { id }, data: parsed.data });
  res.json({ ok: true, data: user });
});
