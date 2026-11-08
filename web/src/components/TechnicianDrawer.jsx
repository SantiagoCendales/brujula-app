import { Check } from 'lucide-react';
import { useState } from 'react';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
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

// Bottom sheet listing technicians as big buttons. `trigger` is the element that opens it.
// `onConfirm(id)` may be async; return false to keep the sheet open (e.g. when the API fails).
export default function TechnicianDrawer({
  technicians,
  initialId = null,
  title,
  description,
  actionLabel,
  onConfirm,
  busy = false,
  error = '',
  trigger,
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(initialId);
  const chosen = technicians.find((technician) => technician.id === selectedId);

  function handleOpenChange(next) {
    if (next) setSelectedId(initialId);
    setOpen(next);
  }

  async function handleConfirm() {
    const keepOpen = (await onConfirm(selectedId)) === false;
    if (!keepOpen) setOpen(false);
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto flex w-full max-w-md flex-col">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <ul className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto px-4">
            {technicians.map((technician) => {
              const selected = technician.id === selectedId;
              return (
                <li key={technician.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(technician.id)}
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-base ${
                      selected ? 'border-primary bg-primary/10' : 'bg-card'
                    }`}
                  >
                    <span className="flex size-10 items-center justify-center rounded-full bg-muted font-semibold">
                      {technician.name.charAt(0)}
                    </span>
                    <span className="flex-1 font-medium">{technician.name}</span>
                    {selected && <Check className="size-5 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <DrawerFooter>
            <ErrorMessage>{error}</ErrorMessage>
            <Button type="button" size="touch" onClick={handleConfirm} disabled={busy || !selectedId}>
              {busy ? 'Guardando…' : chosen ? `${actionLabel} a ${chosen.name}` : 'Elige un técnico'}
            </Button>
            <DrawerClose asChild>
              <Button type="button" size="lg" variant="ghost">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
