import { useAuth } from '../auth/AuthContext.jsx';
import { ROLE_LABELS } from '../lib/labels.js';

// Placeholder home for every role until their real screens exist (blocks 2–4).
// TODO(block 1): use Sebas's <Header userName roleLabel onLogout /> once it lands.
export default function RoleHome() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <header className="flex items-center justify-between bg-brand px-4 py-3 text-white">
        <div>
          <p className="font-bold">Brújula</p>
          <p className="text-sm opacity-90">
            {user.name} · {ROLE_LABELS[user.role]}
          </p>
        </div>
        <button type="button" onClick={logout} className="rounded-lg bg-white/15 px-3 py-2 text-sm font-medium">
          Salir
        </button>
      </header>
      <main className="p-6">
        <h1 className="text-xl font-semibold">Inicio · {ROLE_LABELS[user.role]}</h1>
        <p className="mt-2 text-slate-600">Pantallas en construcción.</p>
      </main>
    </div>
  );
}
