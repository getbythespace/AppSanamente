// src/pages/api/auth/me.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { prisma } from "@/lib/prisma";
import type { RoleType } from "@/types/roles";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Método no permitido" });
  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.email)
      return res.status(401).json({ error: "No autenticado" });

    const email = data.user.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastNamePaternal: true,
        lastNameMaternal: true,
        rut: true,
        dob: true,
        isPsychologist: true,
        organizationId: true,
        activeRole: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: { select: { role: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const rolesFromDB = user.roles.map((r) => r.role as RoleType);
    const allRoles: RoleType[] = [...rolesFromDB];
    if (user.isPsychologist && !allRoles.includes("PSYCHOLOGIST"))
      allRoles.push("PSYCHOLOGIST");
    if (user.activeRole && !allRoles.includes(user.activeRole as RoleType))
      allRoles.push(user.activeRole as RoleType);
    if (allRoles.length === 0) allRoles.push("PATIENT");

    return res.json({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastNamePaternal: user.lastNamePaternal,
        lastNameMaternal: user.lastNameMaternal,
        rut: user.rut,
        dob: user.dob,
        isPsychologist: user.isPsychologist,
        organizationId: user.organizationId,
        activeRole: user.activeRole,
        status: user.status,
        roles: allRoles,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err: any) {
    console.error("Error in /api/auth/me:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
