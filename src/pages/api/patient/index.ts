import type { NextApiRequest, NextApiResponse } from 'next'
import { requireRole } from '../../../utils/requireRole'
import { getAccessiblePatients } from '../../../utils/patientAccess'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await requireRole(req, ['ADMIN', 'PSYCHOLOGIST', 'ASSISTANT'])
    if (req.method !== 'GET') return res.status(405).end()
    const patients = await getAccessiblePatients(user)
    res.json(patients)
  } catch (err: any) {
    res.status(403).json({ error: err.message })
  }
}