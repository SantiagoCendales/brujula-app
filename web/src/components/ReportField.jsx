import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ReportField({ value, onChange, maxLength = 10_000, dirty = false }) {
  const fieldId = useId();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={fieldId} className="text-base">
        Informe
      </Label>
      <Textarea
        id={fieldId}
        rows={6}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="¿Qué encontraste y qué hiciste?"
        className="text-base"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {value.length} / {maxLength}
        </span>
        {dirty && <span className="text-amber-700">Sin guardar</span>}
      </div>
    </div>
  );
}