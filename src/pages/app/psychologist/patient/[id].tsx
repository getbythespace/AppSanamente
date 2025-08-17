
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { fetcher } from '../../../../services/fetcher';
import { Card, Stat, Button, Badge } from '../../../../components/Ui';
import { useState } from 'react';

export default function PacienteDetalle() {
  const { query:{ id } } = useRouter();
  const { data, isLoading, mutate } = useSWR(id ? `/api/psychologist/patients/${id}/overview` : null, fetcher);
  const d = data?.data;

  const [note, setNote] = useState('');
  const [dx, setDx] = useState('');

  if (!id) return null;
  if (isLoading) return <div className="p-6">Cargando…</div>;
  if (!d) return <div className="p-6">Sin datos</div>;

  async function saveNote() {
    const res = await fetch('/api/session-notes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ patientId: id, note })});
    if (res.ok) { setNote(''); mutate(); }
  }
  async function saveDx() {
    if (!dx.trim()) return;
    const res = await fetch(`/api/diagnoses/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: dx })});
    if (res.ok) { setDx(''); mutate(); }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{d.patient.name}</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={()=>history.back()}>Volver</Button>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Promedio 7 días" value={d.metrics.avg7} />
        <Stat label="Último registro" value={d.metrics.last ?? '—'} />
        <Card>
          <p className="text-sm text-slate-500">Diagnóstico activo</p>
          <div className="mt-1 text-sm">{d.diagnosis?.text ?? '—'}</div>
          <div className="mt-2 flex gap-2">
            <input className="border rounded px-3 py-2 w-full" placeholder="Actualizar diagnóstico…" value={dx} onChange={e=>setDx(e.target.value)} />
            <Button onClick={saveDx}>Guardar</Button>
          </div>
        </Card>
      </section>

      <Card>
        <h2 className="font-semibold mb-3">Ánimo (últimos 30 días)</h2>
        <div className="flex gap-2 items-end min-h-[120px]">
          {d.entries.map((m:any)=>(
            <div key={m.id} className="flex flex-col items-center">
              <div className="w-3 bg-[#1F3B77] rounded" style={{height: `${m.score*10}px`}} />
              <span className="text-[10px] text-slate-500 mt-1">
                {new Date(m.date).toLocaleDateString(undefined,{ day:'2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold mb-2">Notas de sesión</h2>
        <div className="flex gap-2 mb-3">
          <input className="border rounded px-3 py-2 w-full" placeholder="Escribe una nota…" value={note} onChange={e=>setNote(e.target.value)} />
          <Button onClick={saveNote}>Agregar</Button>
        </div>
        <div className="space-y-2">
          {d.notes.map((n:any)=>(
            <div key={n.id} className="rounded-lg border p-3 text-sm">
              <div className="text-slate-500 text-xs">{new Date(n.date).toLocaleString()}</div>
              <div>{n.note}</div>
            </div>
          ))}
          {d.notes.length === 0 && <div className="text-slate-500 text-sm">Sin notas aún.</div>}
        </div>
      </Card>
    </div>
  );
}
