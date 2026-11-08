import { Camera, ClipboardCheck, Gauge, Satellite, Unplug, Wrench } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ACTIVITY_TYPE_LABELS } from '@/lib/labels';

const TYPE_ICONS = {
  gps_install: Satellite,
  camera_install: Camera,
  sensor_install: Gauge,
  maintenance: Wrench,
  inspection: ClipboardCheck,
  uninstall: Unplug,
};

// Activity type as big icon buttons instead of a dropdown: everything visible, one tap.
export default function ActivityTypePicker({ value, onChange }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      // Radix sends '' when the selected item is tapped again; keep the current choice instead.
      onValueChange={(next) => next && onChange(next)}
      variant="outline"
      aria-label="Tipo de servicio"
      className="grid w-full grid-cols-2 gap-2"
    >
      {Object.entries(ACTIVITY_TYPE_LABELS).map(([type, label]) => {
        const Icon = TYPE_ICONS[type];
        return (
          <ToggleGroupItem
            key={type}
            value={type}
            className="h-20 flex-col gap-1.5 rounded-xl! border text-sm data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
          >
            <Icon className="size-6" />
            {label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
