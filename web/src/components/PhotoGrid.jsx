import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiUrl } from '@/lib/api';
import { PHOTO_CATEGORY_LABELS } from '@/lib/labels';

function photoUrl(url) {
  return /^(https?:|data:)/i.test(url) ? url : apiUrl(url);
}

export default function PhotoGrid({ photos = [], onDelete }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  if (photos.length === 0) return null;

  const selectedLabel = selectedPhoto
    ? (PHOTO_CATEGORY_LABELS[selectedPhoto.category] ?? 'Foto del servicio')
    : '';

  return (
    <Dialog open={selectedPhoto !== null} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => {
          const label = PHOTO_CATEGORY_LABELS[photo.category] ?? 'Foto del servicio';

          return (
            <figure key={photo.id} className="relative min-w-0">
              <button
                type="button"
                onClick={() => setSelectedPhoto(photo)}
                aria-label={`Ampliar ${label.toLowerCase()}`}
                className="block aspect-square w-full overflow-hidden rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <img src={photoUrl(photo.url)} alt={label} className="size-full object-cover" />
              </button>
              {onDelete && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  onClick={() => onDelete(photo.id)}
                  aria-label={`Eliminar ${label.toLowerCase()}`}
                  className="absolute top-1 right-1 rounded-full bg-background/90 shadow"
                >
                  <X />
                </Button>
              )}
              <figcaption className="mt-1 truncate text-xs text-muted-foreground">{label}</figcaption>
            </figure>
          );
        })}
      </div>

      <DialogContent className="max-w-4xl border-0 bg-transparent p-0 text-white shadow-none ring-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{selectedLabel}</DialogTitle>
          <DialogDescription>Vista ampliada de la foto del servicio.</DialogDescription>
        </DialogHeader>
        {selectedPhoto && (
          <img
            src={photoUrl(selectedPhoto.url)}
            alt={selectedLabel}
            className="max-h-[85dvh] w-full object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}