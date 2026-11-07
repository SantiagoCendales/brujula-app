import { useState } from 'react';
import { request } from '../lib/api.js';

const ACTIONS = {
  validate: {
    roles: ['cec', 'admin'],
    status: 'report_ready',
    label: 'Validar informe',
    hint: 'Revisa el informe y las fotos. Al validar queda registrado quién y cuándo.',
  },
  deliver: {
    roles: ['coordinator', 'admin'],
    status: 'validated',
    label: 'Marcar como entregada al cliente',
    hint: 'El informe ya fue validado por el CEC.',
  },
};

// CEC validates a finished report; the coordinator then marks it as delivered.
export default function ReviewActions({ activity, role, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [action, config] =
    Object.entries(ACTIONS).find(([, candidate]) => candidate.roles.includes(role) && candidate.status === activity.status) ?? [];
  if (!action) return null;

  async function handleClick() {
    setBusy(true);
    setError('');
    try {
      const result = await request(`/activities/${activity.id}/${action}`, { method: 'POST' });
      onChange(result.activity);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-600">{config.hint}</p>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="w-full rounded-xl bg-brand py-4 text-lg font-semibold text-white disabled:opacity-60"
      >
        {busy ? 'Guardando…' : config.label}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
