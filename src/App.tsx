import { lazy, Suspense } from 'react';

import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/AuthContext';

import ProtectedRoute from './components/ProtectedRoute';
import PrivateLayout from './components/PrivateLayout';

import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ContactPage from './pages/ContactPage';
import HelpPage from './pages/HelpPage';
import NotFoundPage from './pages/NotFoundPage';
import RecoverPasswordPage from './pages/RecoverPasswordPage';

import { ThemeProvider } from './theme/ThemeProvider';
import ThemeToggle from './components/ThemeToggle';

import './App.css';
import './theme/theme.css';
import './components/PrivateLayout.css';

/*
 * MateCode SPA
 * Etapa 8 - Optimizacion previa a Etapa 9.
 *
 * Carga diferida de las pantallas privadas
 * con el objetivo de reducir el JavaScript
 * necesario durante la carga inicial.
 *
 * No cambia rutas, permisos ni contratos.
 */

const DashboardPage = lazy(
  () => import('./pages/DashboardPage'),
);

const TasksPage = lazy(
  () => import('./pages/TasksPage'),
);

const ProfilePage = lazy(
  () => import('./pages/ProfilePage'),
);

const SettingsPage = lazy(
  () => import('./pages/SettingsPage'),
);

function SessionLoading() {
  return (
    <main aria-live="polite" aria-busy="true">
      <p role="status">Comprobando sesión...</p>
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

/*
 * Conserva el proceso actual de redireccion
 * tras el inicio de sesion.
 */
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

/*
 * Identifica las secciones cuyo contenido
 * se encuentra dentro de PrivateLayout.
 */
function isPrivatePath(pathname: string): boolean {
  return (
    pathname === '/panel' ||
    pathname === '/tareas' ||
    pathname.startsWith('/tareas/') ||
    pathname === '/perfil' ||
    pathname === '/configuracion'
  );
}

function isInformationPath(pathname: string): boolean {
  return (
    pathname === '/ayuda' ||
    pathname === '/contacto'
  );
}

/*
 * Navegacion adaptable.
 *
 * Visitante:
 * - Ayuda y Contacto son publicos.
 *
 * Sesion autenticada:
 * - Ayuda y Contacto utilizan PrivateLayout.
 *
 * El estado de carga evita mostrar
 * una presentacion incorrecta mientras
 * se resuelve la sesion.
 */
function InformationRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (status === 'authenticated') {
    return <PrivateLayout />;
  }

  return <Outlet />;
}

/*
 * El selector de tema publico se muestra
 * solamente fuera de la arquitectura privada.
 *
 * Se conserva un unico ThemeProvider.
 */
function PublicThemeToolbar() {
  const { pathname } = useLocation();
  const { status } = useAuth();

  if (isPrivatePath(pathname)) {
    return null;
  }

  if (isInformationPath(pathname)) {
    if (
      status === 'authenticated' ||
      status === 'loading'
    ) {
      return null;
    }
  }

  return (
    <div
      className="matecode-theme-toolbar"
      role="region"
      aria-label="Apariencia de MateCode"
    >
      <ThemeToggle />
    </div>
  );
}

/*
 * Contenedor completo de rutas.
 *
 * Mantiene:
 * - Autenticacion existente.
 * - Sistema de temas.
 * - Proteccion de rutas privadas.
 * - Navegacion responsive.
 * - Redireccion del login.
 * - Compatibilidad con MemoryRouter.
 *
 * Suspense gestiona la carga diferida de:
 * - DashboardPage.
 * - TasksPage.
 * - ProfilePage.
 * - SettingsPage.
 */
export function AppRoutes() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PublicThemeToolbar />

        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Inicio y paginas publicas */}

            <Route
              path="/"
              element={<HomeRoute />}
            />

            <Route
              path="/acerca-de"
              element={<AboutPage />}
            />

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

            {/*
              Ayuda y Contacto.

              Se conservan las rutas publicas
              originales y la presentacion
              adaptable a la sesion.
            */}

            <Route element={<InformationRoute />}>
              <Route
                path="/ayuda"
                element={<HelpPage />}
              />

              <Route
                path="/contacto"
                element={<ContactPage />}
              />
            </Route>

            {/*
              Rutas privadas.

              ProtectedRoute mantiene el
              control de acceso validado
              en el bloque 4D.
            */}

            <Route element={<ProtectedRoute />}>
              <Route element={<PrivateLayout />}>
                <Route
                  path="/panel"
                  element={<DashboardPage />}
                />

                <Route
                  path="/tareas"
                  element={<TasksPage />}
                />

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

                <Route
                  path="/perfil"
                  element={<ProfilePage />}
                />

                <Route
                  path="/configuracion"
                  element={<SettingsPage />}
                />
              </Route>
            </Route>

            {/* Ruta desconocida */}

            <Route
              path="*"
              element={<NotFoundPage />}
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}

/*
 * Aplicacion principal.
 *
 * BrowserRouter proporciona las rutas.
 * AppRoutes contiene todos los proveedores.
 */
function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
