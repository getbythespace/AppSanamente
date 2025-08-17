
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApi } from '@/utils/apiHandler';
import { z } from 'zod';
import type { AppRole } from '@/types/roles';

const schema = z.object({ text: z.string().min(3).max(8000) });

export default withApi(['PUT'], ['PSYCHOLOGIST','ADMIN','SUPERADMIN'] as AppRole[],
  async (req:NextApiRequest, res:NextApiResponse, { prisma, userId, roles }) => {
    const patientId = req.query.patientId as string;
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok:false, error:'VALIDATION', issues: parsed.error.issues });
    const { text } = parsed.data;

    const me = await prisma.user.findUnique({ where: { id: userId }, select:{ id:true, organizationId:true } });
    const patient = await prisma.user.findUnique({ where: { id: patientId }, select:{ id:true, assignedPsychologistId:true, organizationId:true } });
    if (!me || !patient) return res.status(404).json({ ok:false, error:'NOT_FOUND' });

    const isSuper = roles.includes('SUPERADMIN');
    const isAdmin = roles.includes('ADMIN');
    const isMine = patient.assignedPsychologistId === me.id;

    if (!isSuper) {
      if (roles.includes('PSYCHOLOGIST') && !isMine) return res.status(403).json({ ok:false, error:'NOT_YOUR_PATIENT' });
      if (isAdmin && patient.organizationId !== me.organizationId) return res.status(403).json({ ok:false, error:'DIFFERENT_ORG' });
    }

    const current = await prisma.diagnosis.findFirst({
      where: { patientId, archived: false },
      orderBy: { updatedAt: 'desc' }
    });

    let dx;
    if (current) {
      if (current.text !== text) {
        await prisma.diagnosisArchive.create({ data: { diagnosisId: current.id, text: current.text } });
        dx = await prisma.diagnosis.update({ where:{ id: current.id }, data: { text } });
      } else {
        dx = current;
      }
    } else {
      dx = await prisma.diagnosis.create({ data: { patientId, psychologistId: me.id, text, archived: false } });
    }

    res.json({ ok:true, data: { id: dx.id, text: dx.text, updatedAt: dx.updatedAt } });
});
