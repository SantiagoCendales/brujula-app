import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { request } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/labels';
import { useApi } from '@/lib/useApi';

const PERMISSION_LABELS = {
  create_activity: 'Crear solicitudes de servicio',
  create_vehicle: 'Crear vehículos',
  assign_technician: 'Asignar técnicos',
  record_field_work: 'Registrar llegada, informe, fotos y recibido',
  finish_report: 'Finalizar o reenviar informes',
  review_report: 'Validar y devolver informes',
  deliver_report: 'Entregar informes',
};
const ROLE_ORDER = ['client', 'technician', 'cec', 'coordinator', 'admin'];

export default function PermissionsPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi('/permissions');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const roles = ROLE_ORDER.filter((role) => data?.permissions.some((item) => item.role === role));

  async function toggle(item) {
    setSaving(true);
    setSaveError('');
    try {
      await request('/permissions', {
        method: 'PATCH',
        body: { role: item.role, permission: item.permission, enabled: !item.enabled },
      });
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
        <Link to="/coordinator/settings">← Configuración</Link>
      </Button>
      <h1 className="text-xl font-semibold">Permisos por rol</h1>
      <p className="text-muted-foreground">
        Activa o desactiva acciones ya autorizadas para cada rol. Los límites de acceso a los datos no cambian.
        {user.role === 'coordinator' && ' Solo Admin puede cambiar permisos de Admin y Coordinador.'}
      </p>
      <ErrorMessage>{error?.message || saveError}</ErrorMessage>
      {loading && !data && <Skeleton className="h-28 rounded-xl" />}
      {roles.map((role) => (
        <Card key={role}>
          <CardHeader><CardTitle>{ROLE_LABELS[role]}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.permissions.filter((item) => item.role === role).map((item) => (
              <div key={item.permission} className="flex items-center justify-between gap-3">
                <span>{PERMISSION_LABELS[item.permission]}</span>
                <Button
                  type="button"
                  variant={item.enabled ? 'default' : 'outline'}
                  aria-label={`${PERMISSION_LABELS[item.permission]}: ${item.enabled ? 'activado' : 'desactivado'}`}
                  aria-pressed={item.enabled}
                  disabled={saving || loading}
                  onClick={() => toggle(item)}
                >
                  {item.enabled ? 'Activado' : 'Desactivado'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
