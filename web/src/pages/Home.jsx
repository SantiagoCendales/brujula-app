import { useEffect, useState } from 'react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { request } from '../lib/api.js';

// Temporary block 0 screen: confirms the front reaches the API. Replaced by the login in block 1.
export default function Home() {
  const [health, setHealth] = useState({ loading: true });
  const [cardMessage, setCardMessage] = useState('Todavía no tocaste la tarjeta.');

  useEffect(() => {
    request('/health')
      .then((data) => setHealth({ ok: true, data }))
      .catch((error) => setHealth({ ok: false, message: error.message }));
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-brand">Brújula</h1>
        <p className="mt-2 text-slate-600">Coordinación y evidencia de servicios técnicos</p>
      </header>

      <Card>
        <h2 className="font-semibold">Estado de la API</h2>
        {health.loading && <p className="mt-2 text-slate-500">Conectando…</p>}
        {health.ok === true && <p className="mt-2 text-emerald-700">✅ API y base de datos conectadas</p>}
        {health.ok === false && <p className="mt-2 text-red-700">❌ {health.message}</p>}
      </Card>

      <section className="space-y-3">
        <h2 className="font-semibold">Botones</h2>
        <Button>Primario</Button>
        <Button variant="secondary">Secundario</Button>
        <Button variant="danger">Peligro</Button>
        <Button loading>Guardando</Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Tarjetas</h2>
        <Card>
          <h3 className="font-semibold">Tarjeta normal</h3>
          <p className="mt-1 text-sm text-slate-600">Esta tarjeta solo muestra contenido.</p>
        </Card>
        <Card onClick={() => setCardMessage('¡La tarjeta respondió al toque!')}>
          <h3 className="font-semibold">Tarjeta tocable</h3>
          <p className="mt-1 text-sm text-slate-600">Tócala para probar la interacción.</p>
        </Card>
        <p aria-live="polite" className="text-sm text-slate-600">{cardMessage}</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Estados</h2>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="requested" />
          <StatusBadge status="assigned" />
          <StatusBadge status="on_site" />
          <StatusBadge status="report_ready" />
          <StatusBadge status="validated" />
          <StatusBadge status="returned" />
          <StatusBadge status="delivered" />
        </div>
      </section>
    </main>
  );
}
