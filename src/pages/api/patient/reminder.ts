import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateAndAuthorize } from "@/utils/auth-server";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("=== [PATIENT-REMINDER] REMINDER API ===");

    // AUTH UNIFICADA - Solo pacientes
    const authResult = await authenticateAndAuthorize(req, res, ["PATIENT"]);

    if ("error" in authResult) {
      console.log("❌ [PATIENT-REMINDER] Auth failed:", authResult.error);
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const user = authResult.user;
    const userId = user.id; // Usar userId según el schema

    if (req.method === "GET") {
      // Obtener configuración de recordatorio
      const reminder = await prisma.patientReminder.findUnique({
        where: { userId }, // Usar userId
        select: {
          enabled: true,
          hour: true,
          minute: true,
        },
      });

      // Convertir hour/minute a formato time
      const timeFormatted = reminder
        ? `${String(reminder.hour).padStart(2, "0")}:${String(
            reminder.minute
          ).padStart(2, "0")}`
        : "21:00";

      return res.json({
        ok: true,
        data: {
          enabled: reminder?.enabled ?? false,
          time: timeFormatted,
        },
      });
    }

    if (req.method === "POST") {
      const { enabled, time } = req.body;

      // Validaciones
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ error: "enabled debe ser boolean" });
      }

      if (
        enabled &&
        (!time || typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time))
      ) {
        return res.status(400).json({ error: "time debe tener formato HH:MM" });
      }

      // Convertir time (HH:MM) a hour/minute
      const [hourStr, minuteStr] = (time || "21:00").split(":");
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // Validar hora y minuto
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return res
          .status(400)
          .json({ error: "Hora inválida. Debe estar entre 00:00 y 23:59" });
      }

      // Upsert (crear o actualizar)
      const reminder = await prisma.patientReminder.upsert({
        where: { userId }, // Usar userId
        create: {
          userId, // Usar userId
          enabled,
          hour,
          minute,
        },
        update: {
          enabled,
          hour,
          minute,
        },
        select: {
          enabled: true,
          hour: true,
          minute: true,
        },
      });

      console.log("✅ [PATIENT-REMINDER] Reminder updated:", {
        userId,
        enabled,
        hour,
        minute,
      });

      // Convertir de vuelta a formato time para la respuesta
      const timeResponse = `${String(reminder.hour).padStart(2, "0")}:${String(
        reminder.minute
      ).padStart(2, "0")}`;

      return res.json({
        ok: true,
        data: {
          enabled: reminder.enabled,
          time: timeResponse,
        },
        message: `Recordatorio ${
          enabled ? "activado" : "desactivado"
        } exitosamente`,
      });
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (error: any) {
    console.error("💥 [PATIENT-REMINDER] Error:", error);
    return res.status(500).json({
      error: "Error interno del servidor",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
