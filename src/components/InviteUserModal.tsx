import React, { useMemo, useState } from 'react';
import { formatRut, isValidRut } from '@/utils/rut';

type Role = 'PSYCHOLOGIST' | 'ASSISTANT' | 'PATIENT';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInvited?: () => void; // para recargar la lista al invitar
}

export default function InviteUserModal({ isOpen, onClose, onInvited }: Props) {
  const [form, setForm] = useState({
    firstName: '',
    lastNamePaternal: '',
    lastNameMaternal: '',
    rut: '',
    email: '',
    role: 'PSYCHOLOGIST' as Role,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(() => {
    if (!form.email) return false;
    if (!form.role) return false;
    // RUT es opcional; si viene, debe ser válido
    if (form.rut && !isValidRut(form.rut)) return false;
    return true;
  }, [form]);

  const handleChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let value = e.target.value;
      if (key === 'rut') {
        // autoformatea al vuelo
        value = formatRut(value);
      }
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  // Llama a la API de invitaciones
  const handleInvite = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        email: form.email.trim().toLowerCase(),
      };

      const res = await fetch('/api/admin/userInvitations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error ${res.status}`);
      }

      setSuccess(true);
      // opcional: cierra + recarga
      setTimeout(() => {
        onClose();
        onInvited?.();
      }, 800);
    } catch (e: any) {
      setError(e.message || 'No se pudo invitar.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Invitar usuario</h3>

        <div className="grid grid-cols-2 gap-3">
          <input
            className="border rounded-md px-3 py-2"
            placeholder="Nombre(s)"
            value={form.firstName}
            onChange={handleChange('firstName')}
          />
          <input
            className="border rounded-md px-3 py-2"
            placeholder="Apellido paterno"
            value={form.lastNamePaternal}
            onChange={handleChange('lastNamePaternal')}
          />
          <input
            className="border rounded-md px-3 py-2"
            placeholder="Apellido materno"
            value={form.lastNameMaternal}
            onChange={handleChange('lastNameMaternal')}
          />
          <input
            className={`border rounded-md px-3 py-2 ${form.rut && !isValidRut(form.rut) ? 'border-red-500' : ''}`}
            placeholder="RUT (12.345.678-9)"
            value={form.rut}
            onChange={handleChange('rut')}
          />
          <input
            className="col-span-2 border rounded-md px-3 py-2"
            placeholder="correo@ejemplo.com"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm text-gray-600 mb-1">Rol *</label>
          <div className="flex gap-2">
            {(['PSYCHOLOGIST', 'ASSISTANT', 'PATIENT'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`px-3 py-1 rounded-md border ${
                  form.role === r ? 'bg-green-600 text-white border-green-600' : 'bg-white'
                }`}
                onClick={() => setForm((p) => ({ ...p, role: r }))}
              >
                {r === 'PSYCHOLOGIST' && 'Psicólogo'}
                {r === 'ASSISTANT' && 'Asistente'}
                {r === 'PATIENT' && 'Paciente'}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        {success && <div className="mt-3 text-sm text-green-600">Invitación enviada ✅</div>}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-md border"
            disabled={loading}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-green-600 text-white disabled:opacity-50"
            onClick={handleInvite}
            disabled={!canSubmit || loading}
          >
            {loading ? 'Enviando…' : 'Invitar'}
          </button>
        </div>
      </div>
    </div>
  );
}
