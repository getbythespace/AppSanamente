import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next'
import { authenticateAndAuthorize } from './auth-server'
import type { RoleType } from '@/types/roles'

export interface AuthedRequest extends NextApiRequest {
  auth: {
    userId: string
    roles: RoleType[]
    organizationId?: string | null
    email: string
  }
}

export function withRole(roles: RoleType[], handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    console.log('🔄 [HOF] WithRole called for:', roles)
    
    const authResult = await authenticateAndAuthorize(req, res, roles)
    
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error })
    }

    // Agregar auth al request
    (req as AuthedRequest).auth = {
      userId: authResult.user.id,
      roles: authResult.user.roles,
      organizationId: authResult.user.organizationId,
      email: authResult.user.email
    }

    return handler(req as AuthedRequest, res)
  }
}

export default withRole