import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const YEAR_LENGTH = 4;

function TextField({ id, label, value, onChange, ...inputProps }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 bg-card text-base" {...inputProps} />
    </div>
  );
}

// Characteristics of a vehicle that is not in the fleet yet. `value` has plate, make, model, vin, year and color
// as strings; `onChange` receives the changed field, like `{ plate: 'ABC123' }`.
export default function NewVehicleFields({ value, onChange }) {
  return (
    <div className="flex flex-col gap-4">
      <TextField
        id="new-plate"
        label="Placa"
        value={value.plate}
        onChange={(plate) => onChange({ plate: plate.toUpperCase() })}
        maxLength={20}
        autoCapitalize="characters"
        autoComplete="off"
        className="h-12 bg-card font-mono text-base tracking-wide"
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField id="new-make" label="Marca" value={value.make} onChange={(make) => onChange({ make })} maxLength={60} />
        <TextField id="new-model" label="Modelo" value={value.model} onChange={(model) => onChange({ model })} maxLength={60} />
      </div>
      <TextField id="new-vin" label="VIN" value={value.vin} onChange={(vin) => onChange({ vin: vin.toUpperCase() })} maxLength={40} autoComplete="off" />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="new-year"
          label="Año"
          value={value.year}
          onChange={(year) => onChange({ year: year.replace(/\D/g, '') })}
          inputMode="numeric"
          maxLength={YEAR_LENGTH}
        />
        <TextField id="new-color" label="Color" value={value.color} onChange={(color) => onChange({ color })} maxLength={40} />
      </div>
    </div>
  );
}

export const EMPTY_NEW_VEHICLE = { plate: '', make: '', model: '', vin: '', year: '', color: '' };

export function isNewVehicleValid(vehicle) {
  return vehicle.plate.trim() !== '';
}
