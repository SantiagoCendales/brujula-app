import { CircleCheck, PackageCheck, Undo2 } from 'lucide-react';
import { useState } from 'react';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { request } from '@/lib/api';

const MIN_NOTE_LENGTH = 3;
const MAX_NOTE_LENGTH = 1000;

function useAction(activity, onChange) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(action, body) {
    setBusy(true);
    setError('');
    try {
      const result = await request(`/activities/${activity.id}/${action}`, { method: 'POST', body });
      onChange(result.activity);
    } catch (actionError) {
      setError(actionError.message);
      setBusy(false);
    }
  }

  return { busy, error, run };
}

// CEC: validate the report, or send it back to the technician with a note.
function ValidateOrReturn({ activity, onChange }) {
  const { busy, error, run } = useAction(activity, onChange);
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState('');

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        {returning ? (
          <>
            <Label htmlFor="return-note" className="text-base">
              ¿Qué tiene que corregir el técnico?
            </Label>
            <Textarea
              id="return-note"
              rows={4}
              maxLength={MAX_NOTE_LENGTH}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ej.: la foto del kilometraje no se lee"
              className="text-base"
            />
            <Button
              size="touch"
              variant="destructive"
              onClick={() => run('return', { note })}
              disabled={busy || note.trim().length < MIN_NOTE_LENGTH}
            >
              <Undo2 />
              {busy ? 'Devolviendo…' : 'Devolver con esta nota'}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setReturning(false)} disabled={busy}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              Revisa el informe y las fotos. Al validar o devolver queda registrado quién y cuándo.
            </p>
            <Button size="touch" onClick={() => run('validate')} disabled={busy}>
              <CircleCheck />
              {busy ? 'Validando…' : 'Validar informe'}
            </Button>
            <Button size="touch" variant="outline" onClick={() => setReturning(true)} disabled={busy}>
              <Undo2 />
              Devolver al técnico
            </Button>
          </>
        )}
        <ErrorMessage>{error}</ErrorMessage>
      </CardContent>
    </Card>
  );
}

function Deliver({ activity, onChange }) {
  const { busy, error, run } = useAction(activity, onChange);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground">
          El informe fue validado por {activity.events.findLast((event) => event.type === 'validated')?.user.name ?? 'el CEC'}.
        </p>
        <Button size="touch" onClick={() => run('deliver')} disabled={busy}>
          <PackageCheck />
          {busy ? 'Guardando…' : 'Marcar como entregada al cliente'}
        </Button>
        <ErrorMessage>{error}</ErrorMessage>
      </CardContent>
    </Card>
  );
}

export default function ReviewActions({ activity, role, onChange }) {
  if (activity.status === 'report_ready' && ['cec', 'admin'].includes(role)) {
    return <ValidateOrReturn activity={activity} onChange={onChange} />;
  }
  if (activity.status === 'validated' && ['coordinator', 'admin'].includes(role)) {
    return <Deliver activity={activity} onChange={onChange} />;
  }
  return null;
}
