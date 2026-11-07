import { Navigate, Route, Routes } from 'react-router';
import { useAuth } from './auth/AuthContext.jsx';
import RequireAuth from './auth/RequireAuth.jsx';
import { homePathFor } from './auth/roles.js';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import RoleHome from './pages/RoleHome.jsx';

function RootRedirect() {
  const { user, checking } = useAuth();
  if (checking) return <p className="p-6 text-center text-slate-500">Cargando…</p>;
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/status" element={<Home />} />
      <Route
        path="/coordinator/*"
        element={
          <RequireAuth roles={['coordinator', 'admin']}>
            <RoleHome />
          </RequireAuth>
        }
      />
      <Route
        path="/technician/*"
        element={
          <RequireAuth roles={['technician']}>
            <RoleHome />
          </RequireAuth>
        }
      />
      <Route
        path="/cec/*"
        element={
          <RequireAuth roles={['cec', 'admin']}>
            <RoleHome />
          </RequireAuth>
        }
      />
      <Route
        path="/client/*"
        element={
          <RequireAuth roles={['client']}>
            <RoleHome />
          </RequireAuth>
        }
      />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
