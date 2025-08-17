import type { NextApiRequest, NextApiResponse } from 'next';
import { withApi } from '@/utils/apiHandler';
import { z } from 'zod';
import type { AppRole } from '@/types/roles';

const bodySchema = z.object({
  psychologistId: z.string().min(10) // cuid()
});

export default withApi(
  ['POST'],
  ['ASSISTANT','ADMIN','PSYCHOLOGIST','SUPERADMIN'] as AppRole[],
  async (req: NextApiRequest, res: NextApiResponse, { prisma, userId, roles }) => {
    const patientId = req.query.id as string;
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok:false, error:'VALIDATION', issues: parsed.error.issues });
    }

    const me = await prisma.user.findUnique({ where: { id: userId } });
    if (!me) return res.status(401).json({ ok:false, error:'USER_NOT_FOUND' });

    const patient = await prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ ok:false, error:'PATIENT_NOT_FOUND' });

    const isPsyOnly = roles.includes('PSYCHOLOGIST') && !roles.some(r => ['ADMIN','ASSISTANT','SUPERADMIN'].includes(r));
    if (isPsyOnly && parsed.data.psychologistId !== me.id) {
      return res.status(403).json({ ok:false, error:'PSY_CANNOT_ASSIGN_OTHERS' });
    }

  
    if (!roles.includes('SUPERADMIN')) {
   
      if ((patient.organizationId ?? null) !== (me.organizationId ?? null)) {
        return res.status(403).json({ ok:false, error:'DIFFERENT_ORG' });
      }
    }

    // Validar que el psychologistId existe y es PSYCHOLOGIST
    const psy = await prisma.user.findFirst({
      where: {
        id: parsed.data.psychologistId,
        roles: { some: { role: 'PSYCHOLOGIST' } }
      },
      select: { id:true, organizationId:true }
    });
    if (!psy) return res.status(400).json({ ok:false, error:'INVALID_PSYCHOLOGIST' });

    if (!roles.includes('SUPERADMIN')) {
      // psicólogo debe estar en la misma org del actor
      if ((psy.organizationId ?? null) !== (me.organizationId ?? null)) {
        return res.status(403).json({ ok:false, error:'PSY_DIFFERENT_ORG' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: patientId },
      data: { assignedPsychologistId: psy.id }
    });


    await prisma.auditLog.create({
      data: {
        userId: me.id,
        action: 'LINK_PSYCHOLOGIST',
        targetId: updated.id,
        description: `Vinculó paciente a psicólogo ${psy.id}`
      }
    });

    res.json({ ok:true, data: { id: updated.id, assignedPsychologistId: updated.assignedPsychologistId } });
  }
);
