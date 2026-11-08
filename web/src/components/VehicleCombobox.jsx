import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Vehicle picker with search by plate (also matches make, model and company). `value` is the vehicle id.
export default function VehicleCombobox({ id, vehicles, value, onChange, showCompany = false }) {
  const [open, setOpen] = useState(false);
  const selected = vehicles.find((vehicle) => vehicle.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-12 w-full justify-between rounded-xl bg-card px-4 text-base font-normal"
        >
          {selected ? (
            <span className="truncate">
              <span className="font-mono font-semibold tracking-wide">{selected.plate}</span>
              <span className="text-muted-foreground">
                {' '}
                · {selected.make} {selected.model}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Buscar por placa…</span>
          )}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Escribe la placa…" className="text-base" />
          <CommandList>
            <CommandEmpty>No hay vehículos con esa placa.</CommandEmpty>
            <CommandGroup>
              {vehicles.map((vehicle) => (
                <CommandItem
                  key={vehicle.id}
                  value={`${vehicle.plate} ${vehicle.make} ${vehicle.model} ${vehicle.company.name}`}
                  onSelect={() => {
                    onChange(vehicle.id);
                    setOpen(false);
                  }}
                  className="py-3"
                >
                  <Check className={vehicle.id === value ? 'opacity-100' : 'opacity-0'} />
                  <div className="min-w-0">
                    <p className="font-mono font-semibold tracking-wide">{vehicle.plate}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {vehicle.make} {vehicle.model}
                      {showCompany && ` · ${vehicle.company.name}`}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
