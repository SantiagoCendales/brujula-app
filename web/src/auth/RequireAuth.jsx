import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthContext.jsx';
import { homePathFor } from './roles.js';

// Only decides which screen to show. The real permission checks happen on the server.
export default function RequireAuth({ roles, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return <p className="p-6 text-center text-muted-foreground">Cargando…</p>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }
  return children;
}
