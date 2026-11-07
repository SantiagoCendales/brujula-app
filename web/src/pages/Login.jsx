import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { homePathFor } from '../auth/roles.js';

const DEMO_EMAILS = [
  'coordinador@brujula.test',
  'tecnico1@brujula.test',
  'cec@brujula.test',
  'cliente.condor@brujula.test',
  'cliente.ceiba@brujula.test',
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to={homePathFor(user.role)} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const signedIn = await login(email, password);
      navigate(homePathFor(signedIn.role), { replace: true });
    } catch (apiError) {
      setError(apiError.message);
      setLoading(false);
    }
  }

  // TODO(block 1): replace this inline form with Sebas's <LoginForm onSubmit loading error /> once it lands.
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-brand">Brújula</h1>
        <p className="mt-2 text-slate-600">Coordinación y evidencia de servicios técnicos</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Correo
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-base"
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      {import.meta.env.DEV && (
        <section className="text-center text-xs text-slate-500">
          <p>Usuarios de demo (contraseña brujula123):</p>
          <ul className="mt-1">
            {DEMO_EMAILS.map((demoEmail) => (
              <li key={demoEmail}>
                <button type="button" className="underline" onClick={() => setEmail(demoEmail)}>
                  {demoEmail}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
