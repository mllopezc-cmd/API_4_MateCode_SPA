import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

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
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import RecoverPasswordPage from './pages/RecoverPasswordPage';

import './App.css';

function HomeRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <main aria-live="polite" aria-busy="true">
        <p>Comprobando sesión...</p>
      </main>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to="/panel" replace />;
  }

  return <HomePage />;
}

export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<HomeRoute />} />
        <Route path="/acerca-de" element={<AboutPage />} />
        <Route
          path="/iniciar-sesion"
          element={<LoginPage />}
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
