import {
    Navigate,
    Outlet,
    useLocation,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
    const {
        status,
        retryInitialization,
    } = useAuth();

    const location = useLocation();

    if (status === 'loading') {
        return (
            <main aria-busy="true">
                <p role="status">
                    Comprobando sesión...
                </p>
            </main>
        );
    }

    if (status === 'error') {
        return (
            <main>
                <p role="alert">
                    No se pudo comprobar tu sesión.
                    Las funciones privadas permanecen bloqueadas.
                </p>
                <button
                    type="button"
                    onClick={retryInitialization}
                >
                    Reintentar
                </button>
            </main>
        );
    }

    if (
        status === 'unauthenticated' ||
        status === 'email-unverified'
    ) {
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
