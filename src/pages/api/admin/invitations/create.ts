import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { authenticateAndAuthorize } from '@/utils/auth-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { formatRut, isValidRut, cleanRut } from '@/utils/rut';

type Role = 'PSYCHOLOGIST' | 'ASSISTANT' | 'PATIENT';

function parseDob(input?: string): Date | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  // dd-mm-yyyy o dd/mm/yyyy
  const m = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function ageFrom(dob: Date): number {
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const m = today.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    // Solo ADMIN, OWNER o SUPERADMIN pueden invitar
    const auth = await authenticateAndAuthorize(req, res, ['ADMIN', 'OWNER', 'SUPERADMIN']);
    if ('error' in auth) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }
    const me = auth.user;
    if (!me.organizationId) {
      return res.status(400).json({ ok: false, error: 'Usuario sin organización' });
    }
    const orgId = me.organizationId;

    // Body
    const {
      firstName = '',
      lastNamePaternal = '',
      lastNameMaternal = '',
      rut = '',
      email,
      role,
      dob, // <-- NUEVO
    } = (req.body || {}) as {
      firstName?: string;
      lastNamePaternal?: string;
      lastNameMaternal?: string;
      rut?: string;
      email?: string;
      role?: Role;
      dob?: string; // yyyy-mm-dd o dd-mm-aaaa / dd/mm/aaaa
    };

    // Validaciones básicas
    if (!email || !role) {
      return res.status(400).json({ ok: false, error: 'Email y rol son requeridos' });
    }
    const emailLower = String(email).trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(emailLower)) {
      return res.status(400).json({ ok: false, error: 'Email inválido' });
    }
    if (!['PSYCHOLOGIST', 'ASSISTANT', 'PATIENT'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'Rol inválido' });
    }

    // RUT (opcional, pero si viene debe ser válido y lo dejamos formateado)
    let rutFormatted: string | null = null;
    if (rut && rut.trim()) {
      const f = formatRut(rut.trim());
      if (!isValidRut(f)) {
        return res.status(400).json({ ok: false, error: 'RUT inválido' });
      }
      rutFormatted = f;
    }

    // ⛔️ Validación de DOB/edad (solo para roles con requisito 18+)
    let dobISO: string | null = null;
    if (role === 'PSYCHOLOGIST' || role === 'ASSISTANT') {
      const parsed = parseDob(dob);
      if (!parsed) {
        return res.status(400).json({ ok: false, error: 'Fecha de nacimiento requerida (formato válido)' });
      }
      const age = ageFrom(parsed);
      if (age < 18) {
        return res.status(400).json({ ok: false, error: 'Debe ser mayor de 18 años para este rol' });
      }
      // Guardamos como ISO YYYY-MM-DD para metadata
      dobISO = parsed.toISOString().slice(0, 10);
    } else {
      // Para paciente es opcional; si viene, la normalizamos
      const parsed = parseDob(dob);
      if (parsed) dobISO = parsed.toISOString().slice(0, 10);
    }

    // Reglas de plan (SOLO/TEAM) y límites
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planLimit: true },
    });
    const plan = org?.plan ?? 'TEAM';
    const assistantsMax = plan === 'SOLO' ? 1 : (org?.planLimit?.assistantsMax ?? 99);

    // Límite de asistentes
    if (role === 'ASSISTANT') {
      const assistantsUsers = await prisma.userRole.count({
        where: {
          role: 'ASSISTANT',
          user: { organizationId: orgId, status: { not: 'DELETED' } },
        },
      });
      const assistantsPending = await prisma.userInvitation.count({
        where: { organizationId: orgId, role: 'ASSISTANT', status: 'PENDING' },
      });
      if (assistantsUsers + assistantsPending >= assistantsMax) {
        return res.status(400).json({ ok: false, error: 'Límite de asistentes alcanzado' });
      }
    }

    // Plan SOLO: no invitar más psicólogos (máximo 1 en total)
    if (plan === 'SOLO' && role === 'PSYCHOLOGIST') {
      const psychUsers = await prisma.user.count({
        where: {
          organizationId: orgId,
          roles: { some: { role: 'PSYCHOLOGIST' } },
        },
      });
      const psychPending = await prisma.userInvitation.count({
        where: { organizationId: orgId, role: 'PSYCHOLOGIST', status: 'PENDING' },
      });
      if (psychUsers + psychPending >= 1) {
        return res
          .status(400)
          .json({ ok: false, error: 'Plan SOLO: no puedes invitar psicólogos adicionales' });
      }
    }

    // Unicidad de email en tu User
    const userByEmail = await prisma.user.findUnique({ where: { email: emailLower } });
    if (userByEmail) {
      return res.status(409).json({ ok: false, error: 'Ya existe un usuario con ese email' });
    }

    // Unicidad de email en invitaciones pendientes
    const inviteByEmail = await prisma.userInvitation.findFirst({
      where: { organizationId: orgId, email: emailLower, status: 'PENDING' },
    });
    if (inviteByEmail) {
      return res
        .status(409)
        .json({ ok: false, error: 'Ya existe una invitación pendiente para ese email' });
    }

    // Unicidad de RUT (si viene)
    if (rutFormatted) {
      const cleaned = cleanRut(rutFormatted); // sin puntos ni guión, DV en mayus
      const conflictRutUser = await prisma.user.findFirst({
        where: { organizationId: orgId, rut: cleaned },
      });
      if (conflictRutUser) {
        return res.status(409).json({ ok: false, error: 'Ya existe un usuario con ese RUT' });
      }

      const conflictRutInvite = await prisma.userInvitation.findFirst({
        where: { organizationId: orgId, rut: cleaned, status: 'PENDING' },
      });
      if (conflictRutInvite) {
        return res
          .status(409)
          .json({ ok: false, error: 'Ya existe una invitación pendiente con ese RUT' });
      }
    }

    // Crear registro de invitación (tabla UserInvitation)
    // (⚠ no cambiamos tu schema; si luego agregas campo dob, aquí lo setearías)
    const token = crypto.randomBytes(32).toString('hex');
    const created = await prisma.userInvitation.create({
      data: {
        organizationId: orgId,
        email: emailLower,
        role,
        firstName: firstName?.trim() || null,
        lastNamePaternal: lastNamePaternal?.trim() || null,
        lastNameMaternal: lastNameMaternal?.trim() || null,
        rut: rutFormatted ? cleanRut(rutFormatted) : null, // guardamos limpio
        status: 'PENDING',
        invitedById: me.id,
        token, // requerido por tu modelo
      },
    });

    // Enviar correo de invitación con Supabase
    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      'http://localhost:3000';

    const redirectTo = `${siteUrl.replace(/\/$/, '')}/auth/set-password?type=invite`;

    const { data: sbData, error: sbError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(emailLower, {
        redirectTo,
        // ✅ guardamos DOB y demás datos en metadata (sin tocar schema)
        data: {
          organizationId: orgId,
          role,
          firstName: firstName?.trim() || '',
          lastNamePaternal: lastNamePaternal?.trim() || '',
          lastNameMaternal: lastNameMaternal?.trim() || '',
          rut: rutFormatted ? cleanRut(rutFormatted) : '',
          dob: dobISO || '', // <-- aquí va la fecha normalizada YYYY-MM-DD
          invitationId: created.id,
        },
      });

    if (sbError) {
      // si falla el envío, elimina el registro para no dejarlo colgado
      await prisma.userInvitation.delete({ where: { id: created.id } });
      console.error('Supabase invite error →', sbError);
      return res
        .status(400)
        .json({ ok: false, error: `No se pudo enviar el correo: ${sbError.message}` });
    }

    return res.status(200).json({ ok: true, supabaseUserId: sbData?.user?.id, invitationId: created.id });
  } catch (e: any) {
    console.error('[ADMIN userInvitations/create] error', e);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
}
