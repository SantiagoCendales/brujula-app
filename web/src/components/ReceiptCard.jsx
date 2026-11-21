import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';

export default function ReceiptCard({ receipt }) {
  if (!receipt) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Constancia de recibido</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        {receipt.kind === 'signed' ? (
          <>
            <p>Recibido por: {receipt.signer_name}</p>
            <p>Documento: {receipt.signer_document}</p>
            <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" role="img" aria-label="Firma de recibido" className="h-48 w-full rounded-md border bg-background">
              {receipt.signature.map((stroke, index) => (
                <polyline key={index} points={stroke.map((point) => point.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>
          </>
        ) : <p>No había nadie presente para firmar.</p>}
        <p className="text-sm text-muted-foreground">
          Registrado por {receipt.recorded_by} · {formatDateTime(receipt.created_at)}
        </p>
      </CardContent>
    </Card>
  );
}
