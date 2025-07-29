import { prisma } from 'src/lib/prisma'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Obtiene el usuario autenticado y sus datos/roles/org desde JWT Bearer en request.
export async function getSessionUser(req: any, res: any) {
  // Lee token del header Authorization
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/, '');

  if (!token) return null;

  // Decodifica el usuario desde el token usando Supabase
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;

  // Busca el usuario en la BD con sus roles y org
  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    include: {
      roles: true,
    },
  });

  if (!user) return null;

  return {
    ...user,
    roles: user.roles,
    organizationId: user.organizationId,
  };
}
