import { CircleCheck, PackageCheck } from 'lucide-react';
import { useState } from 'react';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { request } from '@/lib/api';

const ACTIONS = {
  validate: {
    roles: ['cec', 'admin'],
    status: 'report_ready',
    label: 'Validar informe',
    Icon: CircleCheck,
    hint: 'Revisa el informe y las fotos. Al validar queda registrado quién y cuándo.',
  },
  deliver: {
    roles: ['coordinator', 'admin'],
    status: 'validated',
    label: 'Marcar como entregada al cliente',
    Icon: PackageCheck,
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
    <Card>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground">{config.hint}</p>
        <Button size="touch" onClick={handleClick} disabled={busy}>
          <config.Icon />
          {busy ? 'Guardando…' : config.label}
        </Button>
        <ErrorMessage>{error}</ErrorMessage>
      </CardContent>
    </Card>
  );
}
