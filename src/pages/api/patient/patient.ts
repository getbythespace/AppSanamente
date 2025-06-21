import type { NextApiRequest, NextApiResponse } from "next";
import { requireRole } from "../../../utils/requireRole";
import { prisma } from "src/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await requireRole(req, ['PATIENT', 'PSYCHOLOGIST']);
    const patientId = req.query.id as string;

    // Solo el paciente dueño o el psicólogo asignado pueden crear/ver
    if (user.roles.some((r: any) => r.role === "PATIENT") && user.id !== patientId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (user.roles.some((r: any) => r.role === "PSYCHOLOGIST")) {
      const patient = await prisma.user.findUnique({ where: { id: patientId } });
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      if (user.id !== patient.assignedPsychologistId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    if (req.method === "POST") {
      const { score, comment } = req.body;
      const entry = await prisma.entry.create({
        data: { patientId, score, comment },
      });
      return res.status(201).json(entry);
    }

    if (req.method === "GET") {
      const entries = await prisma.entry.findMany({
        where: { patientId },
        orderBy: { date: "desc" },
      });
      return res.status(200).json(entries);
    }

    res.setHeader("Allow", ["GET","POST"]);
    return res.status(405).end("Method Not Allowed");
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
}