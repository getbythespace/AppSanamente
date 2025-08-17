
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApi } from '@/utils/apiHandler';
import { z } from 'zod';
import type { AppRole } from '@/types/roles';

const schema = z.object({ patientId: z.string().min(10), note: z.string().min(2).max(2000) });

export default withApi(['POST'], ['PSYCHOLOGIST'] as AppRole[],
  async (req:NextApiRequest, res:NextApiResponse, { prisma, userId }) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok:false, error:'VALIDATION', issues: parsed.error.issues });
    const { patientId, note } = parsed.data;

    const [me, patient] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id:true } }),
      prisma.user.findUnique({ where: { id: patientId }, select: { id:true, assignedPsychologistId:true } })
    ]);
    if (!me || !patient) return res.status(404).json({ ok:false, error:'NOT_FOUND' });
    if (patient.assignedPsychologistId !== me.id) return res.status(403).json({ ok:false, error:'NOT_YOUR_PATIENT' });

    const created = await prisma.sessionNote.create({
      data: { patientId, psychologistId: me.id, note }
    });
    res.status(201).json({ ok:true, data: created });
});
