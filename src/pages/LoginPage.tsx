import { useState, type FormEvent } from 'react';
import {
    Link,
    useLocation,
    useNavigate,
} from 'react-router-dom';
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
        (
            typeof search !== 'string' ||
            (search !== '' && !search.startsWith('?'))
        )
    ) {
        return fallback;
    }

    if (
        hash !== undefined &&
        (
            typeof hash !== 'string' ||
            (hash !== '' && !hash.startsWith('#'))
        )
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
    const {
        login,
        status,
        retryInitialization,
    } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const from = getSafeReturnTo(location.state?.from);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setFormError('');
        setIsSubmitting(true);

        try {
            const credential = await login(email, password);

            if (!credential.user.emailVerified) {
                navigate('/verificar-correo', {
                    replace: true,
                    state: {
                        email: credential.user.email ?? email.trim(),
                        returnTo: from,
                    },
                });
                return;
            }

            navigate(from, { replace: true });
        } catch (cause) {
            setFormError(
                cause instanceof Error
                    ? cause.message
                    : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    const isInitializationBlocked =
        status === 'loading' || status === 'error';

    return (
        <main className="page-shell">
            <h1>Iniciar sesión</h1>

            <p>Accede a tu espacio de trabajo de MateCode.</p>

            {status === 'error' && (
                <section role="alert">
                    <p>
                        No se pudo inicializar la autenticación.
                        Comprueba tu conexión e inténtalo de nuevo.
                    </p>

                    <button
                        type="button"
                        onClick={retryInitialization}
                    >
                        Reintentar conexión
                    </button>
                </section>
            )}

            {status === 'email-unverified' && (
                <section>
                    <p role="status">
                        Tu correo todavía no está verificado.
                        Debes completar la verificación antes
                        de acceder a las funciones privadas.
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate('/verificar-correo', {
                                replace: true,
                                state: {
                                    email: email.trim(),
                                    returnTo: from,
                                },
                            })
                        }
                    >
                        Ir a verificar mi correo
                    </button>
                </section>
            )}

            {formError && (
                <p role="alert">{formError}</p>
            )}

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="login-email">
                        Correo electrónico
                    </label>

                    <input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        disabled={
                            isSubmitting || isInitializationBlocked
                        }
                    />
                </div>

                <div>
                    <label htmlFor="login-password">
                        Contraseña
                    </label>

                    <input
                        id="login-password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        disabled={
                            isSubmitting || isInitializationBlocked
                        }
                    />

                    <p>
                        <Link to="/recuperar-contrasena">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={
                        isSubmitting || isInitializationBlocked
                    }
                >
                    {isSubmitting
                        ? 'Iniciando sesión...'
                        : 'Iniciar sesión'}
                </button>
            </form>

            <p>
                ¿No tienes cuenta?{' '}
                <Link to="/crear-cuenta">Crear cuenta</Link>
            </p>

            <Link to="/">Volver al inicio</Link>
        </main>
    );
}