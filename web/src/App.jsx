import { Navigate, Route, Routes } from 'react-router';
import { useAuth } from './auth/AuthContext.jsx';
import RequireAuth from './auth/RequireAuth.jsx';
import { homePathFor } from './auth/roles.js';
import AppLayout from './layout/AppLayout.jsx';
import ActivitiesPage from './pages/ActivitiesPage.jsx';
import ActivityDetailPage from './pages/ActivityDetailPage.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import NewActivityPage from './pages/NewActivityPage.jsx';
import VehicleDetailPage from './pages/VehicleDetailPage.jsx';
import VehiclesPage from './pages/VehiclesPage.jsx';

function RootRedirect() {
  const { user, checking } = useAuth();
  if (checking) return <p className="p-6 text-center text-muted-foreground">Cargando…</p>;
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}

function roleSection(roles) {
  return (
    <RequireAuth roles={roles}>
      <AppLayout />
    </RequireAuth>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/status" element={<Home />} />

      <Route path="/coordinator" element={roleSection(['coordinator', 'admin'])}>
        <Route
          index
          element={
            <ActivitiesPage
              title="Actividades"
              basePath="/coordinator/activities"
              newActivityPath="/coordinator/new"
              newActivityLabel="+ Nueva"
            />
          }
        />
        <Route path="new" element={<NewActivityPage basePath="/coordinator" />} />
        <Route path="activities/:id" element={<ActivityDetailPage backPath="/coordinator" />} />
        <Route path="vehicles" element={<VehiclesPage title="Vehículos" basePath="/coordinator/vehicles" />} />
        <Route
          path="vehicles/:id"
          element={<VehicleDetailPage backPath="/coordinator/vehicles" activitiesPath="/coordinator/activities" />}
        />
      </Route>

      <Route path="/technician" element={roleSection(['technician'])}>
        <Route
          index
          element={
            <ActivitiesPage
              title="Mis pendientes"
              baseQuery="view=pending"
              basePath="/technician/activities"
              showFilter={false}
            />
          }
        />
        <Route
          path="history"
          element={
            <ActivitiesPage
              title="Mi historial"
              baseQuery="view=history"
              basePath="/technician/activities"
              showFilter={false}
            />
          }
        />
        <Route path="activities/:id" element={<ActivityDetailPage backPath="/technician" />} />
      </Route>

      <Route path="/cec" element={roleSection(['cec', 'admin'])}>
        <Route index element={<ActivitiesPage title="Actividades" basePath="/cec/activities" initialStatus="report_ready" />} />
        <Route path="activities/:id" element={<ActivityDetailPage backPath="/cec" />} />
        <Route path="vehicles" element={<VehiclesPage title="Vehículos" basePath="/cec/vehicles" />} />
        <Route
          path="vehicles/:id"
          element={<VehicleDetailPage backPath="/cec/vehicles" activitiesPath="/cec/activities" />}
        />
      </Route>

      <Route path="/client" element={roleSection(['client'])}>
        <Route
          index
          element={
            <ActivitiesPage
              title="Mis servicios"
              basePath="/client/activities"
              newActivityPath="/client/new"
              newActivityLabel="+ Solicitar"
            />
          }
        />
        <Route path="new" element={<NewActivityPage basePath="/client" />} />
        <Route path="activities/:id" element={<ActivityDetailPage backPath="/client" />} />
        <Route path="vehicles" element={<VehiclesPage title="Mis vehículos" basePath="/client/vehicles" />} />
        <Route
          path="vehicles/:id"
          element={<VehicleDetailPage backPath="/client/vehicles" activitiesPath="/client/activities" />}
        />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
