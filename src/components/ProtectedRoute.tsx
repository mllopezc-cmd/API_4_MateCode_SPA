import {
    Navigate,
    Outlet,
    useLocation,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

/**
 * MateCode SPA
 * Etapa 8 - Bloque 4D
 *
 * Protección defensiva de rutas privadas.
 *
 * Únicamente el estado authenticated
 * permite mostrar contenido privado.
 *
 * Ante estados desconocidos, el acceso
 * permanece bloqueado.
 */
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

    /*
     * Único estado que autoriza
     * la visualización de rutas privadas.
     */
    if (status === 'authenticated') {
        return <Outlet />;
    }

    /*
     * Denegación por defecto:
     *
     * - Sin autenticación.
     * - Correo sin verificar.
     * - Cualquier estado inesperado.
     *
     * Se conserva el destino solicitado
     * para el flujo de inicio de sesión.
     */
    return (
        <Navigate
            to="/iniciar-sesion"
            replace
            state={{ from: location }}
        />
    );
}
