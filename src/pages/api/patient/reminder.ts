import type { NextApiRequest, NextApiResponse } from 'next';
import { withApi } from '@/utils/apiHandler';
import { z } from 'zod';
import type { AppRole } from '@/types/roles';
import { prisma } from '@/lib/prisma';


const patchSchema = z.object({
  hour: z.number().int().min(0).max(23).optional(),
  minute: z.number().int().min(0).max(59).optional(),
  enabled: z.boolean().optional()
}).refine(d => Object.keys(d).length > 0, { message: 'No fields to update' });

export default withApi(['GET','PATCH'], ['PATIENT'] as AppRole[], async (req:NextApiRequest, res:NextApiResponse, { prisma, userId }) => {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return res.status(403).json({ ok:false, error:'NOT_PATIENT' });

  if (req.method === 'GET') {
    const reminder = await prisma.reminder.findUnique({ where: { userId: me.id } });
    return res.json({ ok:true, data: reminder ?? null });
  }

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok:false, error:'VALIDATION', issues: parsed.error.issues });

  const up = await prisma.reminder.upsert({
    where: { userId: me.id },
    update: parsed.data,
    create: {
      userId: me.id,
      hour: parsed.data.hour ?? 21,
      minute: parsed.data.minute ?? 0,
      enabled: parsed.data.enabled ?? true
    }
  });
  res.json({ ok:true, data: up });
});
