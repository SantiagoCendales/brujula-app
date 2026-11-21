import { useRef, useState } from 'react';
import ConfirmAction from '@/components/ConfirmAction';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { request } from '@/lib/api';

const MAX_POINTS = 4000;

export default function ReceiptStep({ activity, onChange }) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [strokes, setStrokes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const drawing = useRef(null);
  const strokesRef = useRef([]);

  function point(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return [
      Math.round(Math.max(0, Math.min(1000, (event.clientX - bounds.left) / bounds.width * 1000))),
      Math.round(Math.max(0, Math.min(1000, (event.clientY - bounds.top) / bounds.height * 1000))),
    ];
  }

  function startStroke(event) {
    if (busy || !event.isPrimary || strokesRef.current.length >= 100) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = event.pointerId;
    strokesRef.current = [...strokesRef.current, [point(event)]];
    setStrokes(strokesRef.current);
  }

  function moveStroke(event) {
    if (drawing.current !== event.pointerId) return;
    const previous = strokesRef.current;
    const last = previous[previous.length - 1];
    if (last.length >= 2000 || previous.reduce((total, stroke) => total + stroke.length, 0) >= MAX_POINTS) return;
    const nextPoint = point(event);
    if (last.at(-1)[0] === nextPoint[0] && last.at(-1)[1] === nextPoint[1]) return;
    strokesRef.current = [...previous.slice(0, -1), [...last, nextPoint]];
    setStrokes(strokesRef.current);
  }

  function endStroke(event) {
    if (drawing.current !== event.pointerId) return;
    drawing.current = null;
    strokesRef.current = strokesRef.current.filter((stroke) => stroke.length >= 2);
    setStrokes(strokesRef.current);
  }

  async function save(kind) {
    setBusy(true);
    setError('');
    try {
      const body = kind === 'signed'
        ? { kind, signer_name: name.trim(), signer_document: document.trim(), signature: strokesRef.current }
        : { kind };
      const result = await request(`/activities/${activity.id}/receipt`, { method: 'POST', body });
      onChange(result.activity);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Recibido del servicio (opcional)</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground">Pide a la persona que recibe que escriba sus datos y firme en este dispositivo.</p>
        <Label htmlFor="receipt-name">Nombre de quien recibe</Label>
        <Input id="receipt-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
        <Label htmlFor="receipt-document">Documento de identidad</Label>
        <Input id="receipt-document" value={document} onChange={(event) => setDocument(event.target.value)} maxLength={50} />
        <p className="text-sm font-medium">Firma aquí</p>
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          role="img"
          aria-label="Área para dibujar la firma con el dedo"
          className="h-48 w-full touch-none rounded-md border bg-background"
          onPointerDown={startStroke}
          onPointerMove={moveStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onLostPointerCapture={endStroke}
        >
          {strokes.map((stroke, index) => (
            <polyline key={index} points={stroke.map((point) => point.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>
        <Button type="button" variant="outline" onClick={() => { strokesRef.current = []; setStrokes([]); }} disabled={busy}>
          Borrar firma
        </Button>
        <ConfirmAction
          title="¿Guardar el recibido firmado?"
          description="La constancia no se puede modificar después de guardarla."
          confirmLabel="Guardar"
          onConfirm={() => save('signed')}
          disabled={busy || !name.trim() || !document.trim() || strokes.length === 0}
        >
          Guardar firma
        </ConfirmAction>
        <ConfirmAction
          title="¿No había nadie para firmar?"
          description="Se guardará esta constancia y no podrás reemplazarla por una firma."
          confirmLabel="Registrar"
          onConfirm={() => save('nobody_present')}
          disabled={busy}
        >
          No había nadie para firmar
        </ConfirmAction>
        <ErrorMessage>{error}</ErrorMessage>
      </CardContent>
    </Card>
  );
}
