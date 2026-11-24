import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import { homePathFor } from '@/auth/roles';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { request } from '@/lib/api';
import { notificationTypeLabel } from '@/lib/labels';
import { useApi } from '@/lib/useApi';

export default function NotificationPreferencesPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi('/notifications/preferences');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function toggle(item) {
    setSaving(true);
    setSaveError('');
    try {
      await request('/notifications/preferences', { method: 'PATCH', body: { type: item.type, enabled: !item.enabled } });
      reload();
    } catch (requestError) {
      setSaveError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <Button asChild variant="ghost" className="w-fit">
        <Link to={`${homePathFor(user.role)}/settings`}>← Configuración</Link>
      </Button>
      <h1 className="text-xl font-semibold">Notificaciones</h1>
      <p className="text-muted-foreground">
        Elige de qué cambios quieres recibir el aviso emergente y la vibración. La campanita guarda siempre todo el historial.
      </p>
      <ErrorMessage>{error?.message || saveError}</ErrorMessage>
      {loading && !data && <Skeleton className="h-28 rounded-xl" />}
      {data && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            {data.preferences.map((item) => {
              const label = notificationTypeLabel(item.type, user.role);
              return (
                <div key={item.type} className="flex min-h-11 items-center justify-between gap-3">
                  <span>{label}</span>
                  {item.mandatory ? (
                    <span className="shrink-0 text-sm text-muted-foreground">Siempre activo</span>
                  ) : (
                    <Button
                      type="button"
                      variant={item.enabled ? 'default' : 'outline'}
                      aria-label={`${label}: ${item.enabled ? 'activado' : 'desactivado'}`}
                      aria-pressed={item.enabled}
                      disabled={saving || loading}
                      onClick={() => toggle(item)}
                    >
                      {item.enabled ? 'Activado' : 'Desactivado'}
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
