import { Camera, Circle, CircleCheck, LoaderCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PhotoChecklist({ items, uploadingCategory, onCapture }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const isComplete = item.count > 0;
        const StatusIcon = isComplete ? CircleCheck : item.required ? Circle : Plus;
        const isUploading = uploadingCategory === item.category;

        return (
          <li key={item.category} className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div className="flex min-w-0 items-center gap-3">
              <StatusIcon
                aria-hidden="true"
                className={`size-5 shrink-0 ${isComplete ? 'text-primary' : 'text-muted-foreground'}`}
              />
              <div className="min-w-0">
                <p className="font-medium">{item.label}</p>
                {item.required && !isComplete && (
                  <p className="text-xs text-destructive">obligatoria</p>
                )}
                {isComplete && (
                  <p className="text-xs text-muted-foreground">
                    {item.count} {item.count === 1 ? 'foto' : 'fotos'}
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => onCapture(item.category)}
              disabled={uploadingCategory !== null}
            >
              {isUploading ? <LoaderCircle className="animate-spin" /> : <Camera />}
              {isUploading ? 'Subiendo…' : 'Tomar'}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}