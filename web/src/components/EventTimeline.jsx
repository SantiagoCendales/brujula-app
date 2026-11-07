import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { eventLabel } from '@/lib/labels';

export default function EventTimeline({ events }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay eventos.</p>
        ) : (
          <ol className="flex flex-col gap-4 border-s-2 border-border ps-4">
            {events.map((event) => (
              <li key={event.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -start-[1.4rem] top-1.5 size-3 rounded-full bg-primary ring-2 ring-card"
                />
                <p className="font-medium">{eventLabel(event)}</p>
                {event.note && <p className="text-sm">“{event.note}”</p>}
                <p className="text-xs text-muted-foreground">
                  {event.user?.name ?? 'Usuario desconocido'} · {formatDateTime(event.created_at)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}