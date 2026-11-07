import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import { homePathFor } from '@/auth/roles';
import BrujulaLogo from '@/components/BrujulaLogo';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEMO_USERS = [
  { label: 'Coordinador', email: 'coordinador@brujula.test' },
  { label: 'Técnico', email: 'tecnico1@brujula.test' },
  { label: 'CEC', email: 'cec@brujula.test' },
  { label: 'Cliente Cóndor', email: 'cliente.condor@brujula.test' },
  { label: 'Cliente Ceiba', email: 'cliente.ceiba@brujula.test' },
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
    <div className="min-h-dvh bg-linear-to-b from-primary/15 via-background to-background">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
        <header className="flex flex-col items-center text-center">
          <div className="flex size-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <BrujulaLogo className="size-12" />
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Brújula</h1>
          <p className="mt-1 text-muted-foreground">Coordinación y evidencia de servicios técnicos</p>
        </header>

        <Card className="shadow-sm">
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
          <section className="text-center">
            <p className="text-xs text-muted-foreground">Usuarios de demo · contraseña brujula123</p>
            <ul className="mt-2 flex flex-wrap justify-center gap-2">
              {DEMO_USERS.map((demo) => (
                <li key={demo.email}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-card"
                    onClick={() => {
                      setEmail(demo.email);
                      setPassword('brujula123');
                    }}
                  >
                    {demo.label}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
