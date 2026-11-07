import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import { homePathFor } from '@/auth/roles';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-primary">Brújula</h1>
        <p className="mt-2 text-muted-foreground">Coordinación y evidencia de servicios técnicos</p>
      </header>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 text-base"
              />
            </div>
            <ErrorMessage>{error}</ErrorMessage>
            <Button type="submit" size="touch" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {import.meta.env.DEV && (
        <section className="text-center text-xs text-muted-foreground">
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
