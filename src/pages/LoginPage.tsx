import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PRIVATE_PATHS = new Set([
    '/panel',
    '/tareas',
    '/tareas/pendientes',
    '/tareas/en-progreso',
    '/tareas/completadas',
    '/tareas/vencidas',
    '/perfil',
    '/configuracion',
]);

interface ReturnLocation {
    pathname: string;
    search: string;
    hash: string;
}

function getSafeReturnTo(from: unknown): ReturnLocation {
    const fallback: ReturnLocation = {
        pathname: '/panel',
        search: '',
        hash: '',
    };

    if (typeof from !== 'object' || from === null) {
        return fallback;
    }

    const candidate = from as Record<string, unknown>;
    const { pathname, search, hash } = candidate;

    if (
        typeof pathname !== 'string' ||
        !PRIVATE_PATHS.has(pathname)
    ) {
        return fallback;
    }

    if (
        search !== undefined &&
        (typeof search !== 'string' ||
            (search !== '' && !search.startsWith('?')))
    ) {
        return fallback;
    }

    if (
        hash !== undefined &&
        (typeof hash !== 'string' ||
            (hash !== '' && !hash.startsWith('#')))
    ) {
        return fallback;
    }

    return {
        pathname,
        search: typeof search === 'string' ? search : '',
        hash: typeof hash === 'string' ? hash : '',
    };
}

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = getSafeReturnTo(location.state?.from);

    function handleLogin() {
        login();
        navigate(from, { replace: true });
    }

    return (
        <main className="page-shell">
            <h1>Iniciar sesión</h1>
            <p>Accede a tu espacio de trabajo de MateCode.</p>
            <button type="button" onClick={handleLogin}>
                Simular inicio de sesión
            </button>
            <p>
                ¿No tienes cuenta? <Link to="/crear-cuenta">Crear cuenta</Link>
            </p>
            <Link to="/">Volver al inicio</Link>
        </main>
    );
}