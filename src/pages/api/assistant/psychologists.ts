import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/utils/withRole";
import { getSessionUser } from "@/utils/auth-server";

export default withRole(
  ["ASSISTANT"],
  async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
      return res.status(405).json({ ok: false, error: "Method not allowed" });

    const me = await getSessionUser(req, res);
    if (!me)
      return res.status(401).json({ ok: false, error: "No autenticado" });

    try {
      // caso 1: asistente en organización (lista completa de psicólogos del ámbito)
      if (me.organizationId) {
        const psy = await prisma.user.findMany({
          where: {
            organizationId: me.organizationId,
            status: "ACTIVE",
            roles: { some: { role: "PSYCHOLOGIST" } },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastNamePaternal: true,
            lastNameMaternal: true,
          },
        });

        return res.status(200).json({
          ok: true,
          data: psy.map((p) => ({
            id: p.id,
            name: `${p.firstName} ${p.lastNamePaternal}${
              p.lastNameMaternal ? ` ${p.lastNameMaternal}` : ""
            }`,
            email: p.email,
          })),
        });
      }

      // caso 2: asistente independiente (solo su sponsor)
      if (!me.organizationId && (me as any).assignedPsychologistId) {
        const psy = await prisma.user.findFirst({
          where: {
            id: (me as any).assignedPsychologistId,
            status: "ACTIVE",
            roles: { some: { role: "PSYCHOLOGIST" } },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastNamePaternal: true,
            lastNameMaternal: true,
          },
        });
        if (!psy)
          return res
            .status(404)
            .json({ ok: false, error: "Psicólogo no encontrado" });

        return res.status(200).json({
          ok: true,
          data: [
            {
              id: psy.id,
              name: `${psy.firstName} ${psy.lastNamePaternal}${
                psy.lastNameMaternal ? ` ${psy.lastNameMaternal}` : ""
              }`,
              email: psy.email,
            },
          ],
        });
      }

      return res
        .status(400)
        .json({ ok: false, error: "Contexto de asistente no válido" });
    } catch (e) {
      console.error("assistant/psychologists error:", e);
      return res
        .status(500)
        .json({ ok: false, error: "Error interno del servidor" });
    }
  }
);
