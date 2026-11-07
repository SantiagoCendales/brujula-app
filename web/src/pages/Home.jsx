import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { request } from '@/lib/api';

// API status screen (/status). Also the place to preview components while building them.
export default function Home() {
  const [health, setHealth] = useState({ loading: true });

  useEffect(() => {
    request('/health')
      .then((data) => setHealth({ ok: true, data }))
      .catch((error) => setHealth({ ok: false, message: error.message }));
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-primary">Brújula</h1>
        <p className="mt-2 text-muted-foreground">Coordinación y evidencia de servicios técnicos</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Estado de la API</CardTitle>
        </CardHeader>
        <CardContent>
          {health.loading && <p className="text-muted-foreground">Conectando…</p>}
          {health.ok === true && <p className="text-emerald-700">✅ API y base de datos conectadas</p>}
          {health.ok === false && <p className="text-destructive">❌ {health.message}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
