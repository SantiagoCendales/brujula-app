import { ChevronRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Configuración</h1>
      <ul className="flex flex-col gap-3">
        <li>
          <Link to="/coordinator/permissions" className="block transition-transform active:scale-[0.99]">
            <Card size="sm">
              <CardContent className="flex min-h-12 items-center gap-3">
                <ShieldCheck className="size-5 shrink-0 text-muted-foreground" />
                <span className="flex-1 font-medium">Permisos por rol</span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </li>
      </ul>
    </section>
  );
}
