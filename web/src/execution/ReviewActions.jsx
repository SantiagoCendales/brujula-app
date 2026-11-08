import { CircleCheck, PackageCheck, Undo2 } from 'lucide-react';
import { useState } from 'react';
import ConfirmAction from '@/components/ConfirmAction';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
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
      return true;
    } catch (actionError) {
      setError(actionError.message);
      setBusy(false);
      return false;
    }
  }

  return { busy, error, run };
}

function ReturnDrawer({ busy, onReturn }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  async function handleReturn() {
    if (await onReturn(note)) setOpen(false);
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="touch" variant="outline" disabled={busy}>
          <Undo2 />
          Devolver al técnico
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto flex w-full max-w-md flex-col">
          <DrawerHeader>
            <DrawerTitle>Devolver al técnico</DrawerTitle>
            <DrawerDescription>Escribe qué tiene que corregir. Le llega un aviso con tu nota.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            <Textarea
              aria-label="Qué tiene que corregir"
              rows={4}
              maxLength={MAX_NOTE_LENGTH}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ej.: la foto del kilometraje no se lee"
              className="text-base"
            />
          </div>
          <DrawerFooter>
            <Button size="touch" variant="destructive" onClick={handleReturn} disabled={busy || note.trim().length < MIN_NOTE_LENGTH}>
              <Undo2 />
              {busy ? 'Devolviendo…' : 'Devolver con esta nota'}
            </Button>
            <DrawerClose asChild>
              <Button size="lg" variant="ghost">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// CEC: validate the report, or send it back to the technician with a note.
function ValidateOrReturn({ activity, onChange }) {
  const { busy, error, run } = useAction(activity, onChange);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground">Revisa el informe y las fotos. Al validar o devolver queda registrado quién y cuándo.</p>
        <ConfirmAction
          title="¿Validar este informe?"
          description="Quedará registrado que lo validaste y el coordinador podrá entregarlo al cliente."
          confirmLabel="Validar"
          onConfirm={() => run('validate')}
          disabled={busy}
        >
          <CircleCheck />
          {busy ? 'Validando…' : 'Validar informe'}
        </ConfirmAction>
        <ReturnDrawer busy={busy} onReturn={(note) => run('return', { note })} />
        <ErrorMessage>{error}</ErrorMessage>
      </CardContent>
    </Card>
  );
}

function Deliver({ activity, onChange }) {
  const { busy, error, run } = useAction(activity, onChange);
  const validatedBy = activity.events.findLast((event) => event.type === 'validated')?.user.name ?? 'el CEC';

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground">El informe fue validado por {validatedBy}.</p>
        <ConfirmAction
          title="¿Entregar al cliente?"
          description={`${activity.company.name} va a poder ver el informe y las fotos, y recibe un aviso.`}
          confirmLabel="Entregar"
          onConfirm={() => run('deliver')}
          disabled={busy}
        >
          <PackageCheck />
          {busy ? 'Guardando…' : 'Marcar como entregada al cliente'}
        </ConfirmAction>
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
