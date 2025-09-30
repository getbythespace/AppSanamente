// src/pages/app/psychologist/sessions/[patientId].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getJson } from "@/services";

type Patient = {
  id: string;
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal?: string;
  rut?: string;
};
type Session = {
  id: string;
  note: string;
  date: string;
  editableUntil: string | null;
  canEdit: boolean;
};

export default function SessionsByPatient() {
  const { query } = useRouter();
  const patientId = String(query.patientId || "");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await getJson(`/api/psychologist/sessions/${patientId}`);
        if (!r?.ok) throw new Error(r?.error || "Error cargando historial");
        setPatient(r.patient as Patient);
        setSessions((r.sessions || []) as Session[]);
      } catch (e: any) {
        setError(e?.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  if (loading)
    return (
      <Layout title="Historial de Sesiones">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );

  if (error || !patient)
    return (
      <Layout title="Historial de Sesiones">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error ?? "Paciente no encontrado"}
        </div>
      </Layout>
    );

  return (
    <Layout
      title={`Historial de Sesiones - ${patient.firstName} ${patient.lastNamePaternal}`}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Link
              href="/app/psychologist"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Volver al Panel
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              Historial de Sesiones
            </h1>
            <p className="text-gray-600">
              {patient.firstName} {patient.lastNamePaternal}{" "}
              {patient.lastNameMaternal ?? ""} • {patient.rut ?? ""}
            </p>
          </div>
          <Link
            href={`/app/psychologist/session/new/${patient.id}`}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            📝 Nueva Sesión
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Sesiones Registradas ({sessions.length})
            </h2>
          </div>

          {sessions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No hay sesiones registradas para este paciente.</p>
              <Link
                href={`/app/psychologist/session/new/${patient.id}`}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Crear primera sesión
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sessions.map((s) => (
                <div key={s.id} className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Sesión del{" "}
                        {format(new Date(s.date), "dd/MM/yyyy", { locale: es })}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(s.date), "HH:mm", { locale: es })}
                        {s.editableUntil && (
                          <span
                            className={`ml-2 ${
                              s.canEdit ? "text-orange-600" : "text-red-600"
                            }`}
                          >
                            • {s.canEdit ? "Editable" : "Bloqueada"}
                          </span>
                        )}
                      </p>
                    </div>
                    {s.canEdit && (
                      <Link
                        href={`/app/psychologist/session/new/${patient.id}?sid=${s.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Editar
                      </Link>
                    )}
                  </div>
                  <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {s.note}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
