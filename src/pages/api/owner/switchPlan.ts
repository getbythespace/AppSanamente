import type { NextApiRequest, NextApiResponse } from 'next'
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(410).json({ error: 'Endpoint deprecated. Usa /api/owner/requestUpgrade y aprobación de SUPERADMIN.' })
}