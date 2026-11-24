import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import { homePathFor } from '@/auth/roles';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { request } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { ACTIVITY_TYPE_LABELS } from '@/lib/labels';
import { useActivityChanges } from '@/lib/liveUpdates';
import { useApi } from '@/lib/useApi';

function notificationTitle(item, role) {
  switch (item.type) {
    case 'assigned': return 'Nueva actividad asignada';
    case 'returned': return `${item.actor_name} devolvió tu informe`;
    case 'arrived': return `${item.actor_name} llegó al sitio`;
    case 'created': return 'Nueva solicitud de servicio';
    case 'finished': return `${item.actor_name} envió ${role === 'cec' || role === 'admin' ? 'un informe para validar' : 'el informe'}`;
    case 'resubmitted': return `${item.actor_name} reenvió el informe corregido`;
    case 'validated': return 'Informe validado: listo para entregar';
    case 'delivered': return 'Tu informe está listo';
    default: return 'Novedad de actividad';
  }
}

export default function NotificationsPanel({ onOpenActivity, onRead }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [before, setBefore] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [busy, setBusy] = useState(null);
  const { data, error, loading, reload } = useApi(`/notifications${before ? `?before=${before}` : ''}`);
  useActivityChanges(reload);

  async function open(item) {
    setBusy({ id: item.id, action: 'open' });
    setErrorMessage('');
    try {
      if (!item.read_at) await request(`/notifications/${item.id}/read`, { method: 'POST' });
      onOpenActivity();
      navigate(`${homePathFor(user.role)}/activities/${item.activity_id}`);
    } catch (requestError) {
      setErrorMessage(requestError.message);
    } finally {
      setBusy(null);
    }
  }

  async function markRead(item) {
    setBusy({ id: item.id, action: 'read' });
    setErrorMessage('');
    try {
      await request(`/notifications/${item.id}/read`, { method: 'POST' });
      reload();
      onRead();
    } catch (requestError) {
      setErrorMessage(requestError.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex min-h-0 flex-col gap-3 overflow-y-auto p-1">
      <h2 className="shrink-0 text-lg font-semibold">Notificaciones</h2>
      {(error || errorMessage) && (
        <div className="sticky top-0 z-10 shrink-0 rounded-lg bg-popover">
          <ErrorMessage>{error?.message || errorMessage}</ErrorMessage>
        </div>
      )}
      {loading && <Skeleton className="h-28 rounded-xl" />}
      {!loading && data?.notifications.length === 0 && (
        <EmptyState icon={Bell} title="No hay notificaciones" description="Aquí aparecerán las novedades que recibas." />
      )}
      {!loading && data?.notifications.map((item) => (
        <Card key={item.id} size="sm" className="shrink-0">
          <CardContent className="flex flex-col gap-2">
            <p className="font-semibold">{notificationTitle(item, user.role)} {!item.read_at && <span className="text-primary">· Nueva</span>}</p>
            <p>{item.plate} · {ACTIVITY_TYPE_LABELS[item.activity_type] ?? item.activity_type}</p>
            <p className="text-sm text-muted-foreground">{formatDateTime(item.created_at)}</p>
            <Button size="touch" variant="outline" disabled={busy !== null} onClick={() => open(item)}>
              {busy?.id === item.id && busy.action === 'open' ? 'Abriendo…' : 'Ver actividad'}
            </Button>
            {!item.read_at && (
              <Button size="touch" variant="ghost" disabled={busy !== null} onClick={() => markRead(item)}>
                {busy?.id === item.id && busy.action === 'read' ? 'Marcando…' : 'Marcar como leída'}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
      {before && <Button className="shrink-0" variant="outline" onClick={() => setBefore(null)}>Volver a las recientes</Button>}
      {!loading && data?.has_more && (
        <Button className="shrink-0" variant="outline" onClick={() => setBefore(data.notifications.at(-1).id)}>Ver anteriores</Button>
      )}
    </section>
  );
}
