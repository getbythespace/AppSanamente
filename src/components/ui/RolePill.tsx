// src/components/ui/RolePill.tsx
export default function RolePill({ role }: { role: string }) {
  const map: Record<string, string> = {
    PATIENT: 'bg-blue-100 text-blue-700',
    PSYCHOLOGIST: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-green-100 text-green-700',
    OWNER: 'bg-amber-100 text-amber-700',
    ASSISTANT: 'bg-slate-200 text-slate-700',
    SUPERADMIN: 'bg-indigo-100 text-indigo-700',
  }
  const label: Record<string, string> = {
    PATIENT: 'Paciente',
    PSYCHOLOGIST: 'Psicólogo',
    ADMIN: 'Administrador',
    OWNER: 'Propietario',
    ASSISTANT: 'Asistente',
    SUPERADMIN: 'Superadmin',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[role] || 'bg-gray-100 text-gray-700'}`}>
      {label[role] || role}
    </span>
  )
}
