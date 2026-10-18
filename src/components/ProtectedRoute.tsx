import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
    const { status } = useAuth();
    const location = useLocation();

    if (status === 'loading') {
        return (
            <main aria-busy="true">
                <p role="status">Comprobando sesión...</p>
            </main>
        );
    }

    if (status === 'unauthenticated') {
        return (
            <Navigate
                to="/iniciar-sesion"
                replace
                state={{ from: location }}
            />
        );
    }

    return <Outlet />;
}
