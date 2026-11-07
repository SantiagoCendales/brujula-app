import { Button } from '@/components/ui/button';
import { STATUS_LABELS } from '@/lib/labels';

const FILTER_STATUSES = Object.keys(STATUS_LABELS).filter((status) => status !== 'returned');

export default function StatusFilter({ value, onChange }) {
  return (
    <div
      role="group"
      aria-label="Filtrar actividades por estado"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {['', ...FILTER_STATUSES].map((status) => (
        <Button
          key={status || 'all'}
          type="button"
          variant={value === status ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(status)}
          className="shrink-0 rounded-full"
        >
          {status ? STATUS_LABELS[status] : 'Todas'}
        </Button>
      ))}
    </div>
  );
}