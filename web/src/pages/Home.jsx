import { useEffect, useState } from 'react';
import { request } from '../lib/api.js';

// Temporary block 0 screen: confirms the front reaches the API. Replaced by the login in block 1.
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
        <h1 className="text-4xl font-bold text-brand">Brújula</h1>
        <p className="mt-2 text-slate-600">Coordinación y evidencia de servicios técnicos</p>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Estado de la API</h2>
        {health.loading && <p className="mt-2 text-slate-500">Conectando…</p>}
        {health.ok === true && <p className="mt-2 text-emerald-700">✅ API y base de datos conectadas</p>}
        {health.ok === false && <p className="mt-2 text-red-700">❌ {health.message}</p>}
      </section>
    </main>
  );
}
