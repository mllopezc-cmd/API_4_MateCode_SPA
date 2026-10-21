import { lazy, Suspense } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ContactPage from './pages/ContactPage';
import HelpPage from './pages/HelpPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import RecoverPasswordPage from './pages/RecoverPasswordPage';

import './App.css';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));

function SessionLoading() {
  return (
    <main aria-live="polite" aria-busy="true">
      <p>Comprobando sesión...</p>
    </main>
  );
}

function HomeRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/panel" replace />;
  }

  return <HomePage />;
}

function LoginRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (status === 'authenticated') {
    const from = (
      location.state as {
        from?: {
          pathname?: unknown;
          search?: unknown;
          hash?: unknown;
        };
      } | null
    )?.from;

    const allowedPrivatePaths = new Set([
      '/panel',
      '/tareas',
      '/tareas/pendientes',
      '/tareas/en-progreso',
      '/tareas/completadas',
      '/tareas/vencidas',
      '/perfil',
      '/configuracion',
    ]);

    const validSearch =
      from?.search === undefined ||
      (
        typeof from.search === 'string' &&
        (
          from.search === '' ||
          from.search.startsWith('?')
        )
      );

    const validHash =
      from?.hash === undefined ||
      (
        typeof from.hash === 'string' &&
        (
          from.hash === '' ||
          from.hash.startsWith('#')
        )
      );

    if (
      from &&
      typeof from.pathname === 'string' &&
      allowedPrivatePaths.has(from.pathname) &&
      validSearch &&
      validHash
    ) {
      const search =
        typeof from.search === 'string'
          ? from.search
          : '';

      const hash =
        typeof from.hash === 'string'
          ? from.hash
          : '';

      return (
        <Navigate
          to={`${from.pathname}${search}${hash}`}
          replace
        />
      );
    }

    return <Navigate to="/panel" replace />;
  }

  return <LoginPage />;
}

function RouteLoadingFallback() {
  return (
    <main aria-live="polite" aria-busy="true">
      <p role="status">Cargando página...</p>
    </main>
  );
}

export function AppRoutes() {
  return (
    <AuthProvider>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<HomeRoute />} />
          <Route path="/acerca-de" element={<AboutPage />} />
          <Route
            path="/iniciar-sesion"
            element={<LoginRoute />}
          />
          <Route
            path="/crear-cuenta"
            element={<RegisterPage />}
          />
          <Route
            path="/verificar-correo"
            element={<VerifyEmailPage />}
          />
          <Route
            path="/recuperar-contrasena"
            element={<RecoverPasswordPage />}
          />
          <Route path="/contacto" element={<ContactPage />} />
          <Route path="/ayuda" element={<HelpPage />} />

          {/* Rutas privadas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/panel" element={<DashboardPage />} />
            <Route path="/tareas" element={<TasksPage />} />
            <Route
              path="/tareas/pendientes"
              element={<TasksPage />}
            />
            <Route
              path="/tareas/en-progreso"
              element={<TasksPage />}
            />
            <Route
              path="/tareas/completadas"
              element={<TasksPage />}
            />
            <Route
              path="/tareas/vencidas"
              element={<TasksPage />}
            />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route
              path="/configuracion"
              element={<SettingsPage />}
            />
          </Route>

          {/* Ruta comodín */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
