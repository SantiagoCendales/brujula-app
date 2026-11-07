import { Button } from '@/components/ui/button';
import { STATUS_LABELS } from '@/lib/labels';

const FILTER_STATUSES = Object.keys(STATUS_LABELS);

// `counts` is optional: the response of GET /activities/counts ({ counts: { status: n }, total }).
export default function StatusFilter({ value, onChange, counts }) {
  return (
    <div
      role="group"
      aria-label="Filtrar actividades por estado"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {['', ...FILTER_STATUSES].map((status) => {
        const selected = value === status;
        const count = status ? counts?.counts[status] : counts?.total;
        return (
          <Button
            key={status || 'all'}
            type="button"
            variant={selected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(status)}
            className="shrink-0 gap-1.5 rounded-full"
          >
            {status ? STATUS_LABELS[status] : 'Todas'}
            {count !== undefined && (
              <span
                className={`min-w-5 rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                  selected ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground'
                }`}
              >
                {count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
