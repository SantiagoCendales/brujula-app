import { Link, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { homePathFor } from '../auth/roles.js';
import { ROLE_LABELS } from '../lib/labels.js';

// Shell for every signed-in screen: header on top, the current page below.
// TODO(T4): replace the inline header with Sebas's <Header userName roleLabel onLogout />.
export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-brand px-4 py-3 text-white">
        <Link to={homePathFor(user.role)}>
          <p className="font-bold">Brújula</p>
          <p className="text-sm opacity-90">
            {user.name} · {ROLE_LABELS[user.role]}
          </p>
        </Link>
        <button type="button" onClick={logout} className="rounded-lg bg-white/15 px-3 py-2 text-sm font-medium">
          Salir
        </button>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
