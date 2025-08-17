
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApi } from '@/utils/apiHandler';
import type { AppRole } from '@/types/roles';

type EntryRow = { score: number; date: Date };
type PatientRow = {
  id: string;
  firstName: string;
  lastNamePaternal: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED';
  entries: EntryRow[];
};

export default withApi(
  ['GET'],
  ['PSYCHOLOGIST'] as AppRole[],
  async (_req: NextApiRequest, res: NextApiResponse, { prisma, userId }) => {
    const me = await prisma.user.findUnique({ where: { id: userId } });
    if (!me) return res.status(403).json({ ok: false, error: 'NOT_PSYCHOLOGIST' });

    const patients: PatientRow[] = await prisma.user.findMany({
      where: { assignedPsychologistId: me.id },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true,
        status: true,
        entries: {
          orderBy: { date: 'desc' },
          take: 7,
          select: { score: true, date: true },
        },
      },
    });

    const data = patients.map((p: PatientRow) => {
      const sum = p.entries.reduce((a: number, b: EntryRow) => a + b.score, 0);
      const avg7 = p.entries.length ? Number((sum / p.entries.length).toFixed(1)) : 0;
      const last = p.entries[0]?.score ?? null;
      return {
        id: p.id,
        name: `${p.firstName} ${p.lastNamePaternal}`,
        isActive: p.status === 'ACTIVE',
        avg7,
        last,
      };
    });

    res.json({ ok: true, data });
  }
);
