import type { NextApiRequest, NextApiResponse } from "next";
import { withUser }    from "../_utils";
import { prisma }      from "src/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withUser(req, res, async (user) => {
    const patientId = req.query.id as string;
    // Solo el paciente dueño o el psicólogo asignado pueden crear
    // 1) Si es paciente, que sólo pueda autoacceder
if (user.role === "PATIENT" && user.id !== patientId) {
  return res.status(403).json({ error: "Forbidden" });
}

// 2) Si es psicólogo, validemos que es el psicólogo asignado.
//    prisma.user.findUnique() podría retornar null.
//    Así evitamos el error de tipo.
if (user.role === "PSYCHOLOGIST") {
  const patient = await prisma.user.findUnique({ where: { id: patientId } });
  if (!patient) {
    // Maneja el caso en que no exista el paciente
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
return res.status(405).end("Method Not Allowed");})}