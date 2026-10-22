import {
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';

import {
    MemoryRouter,
    Route,
    Routes,
    useLocation,
} from 'react-router-dom';

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import ProtectedRoute from '../src/components/ProtectedRoute';

/*
 * Estado de autenticación controlado
 * independientemente de Firebase.
 */
const authMock = vi.hoisted(() => ({
    status: 'unauthenticated' as string,
    retryInitialization: vi.fn(),
}));

vi.mock('../src/context/AuthContext', () => ({
    useAuth: () => ({
        status: authMock.status,
        retryInitialization: authMock.retryInitialization,
    }),
}));

function LoginDestination() {
    const location = useLocation();

    const state = location.state as {
        from?: {
            pathname?: string;
            search?: string;
            hash?: string;
        };
    } | null;

    return (
        <main>
            <h1>Inicio de sesión</h1>

            <output data-testid="return-path">
                {state?.from?.pathname ?? ''}
                {state?.from?.search ?? ''}
                {state?.from?.hash ?? ''}
            </output>
        </main>
    );
}

function renderProtectedRoute(
    initialPath = '/panel',
) {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
                <Route element={<ProtectedRoute />}>
                    <Route
                        path="/panel"
                        element={
                            <h1>Panel privado</h1>
                        }
                    />

                    <Route
                        path="/tareas/pendientes"
                        element={
                            <h1>Tareas pendientes</h1>
                        }
                    />
                </Route>

                <Route
                    path="/iniciar-sesion"
                    element={<LoginDestination />}
                />
            </Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    authMock.status = 'unauthenticated';
    authMock.retryInitialization.mockReset();
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('ProtectedRoute: acceso privado seguro', () => {
    it(
        'permite entrar con una sesión autenticada',
        () => {
            authMock.status = 'authenticated';

            renderProtectedRoute();

            expect(
                screen.getByRole('heading', {
                    name: 'Panel privado',
                }),
            ).toBeInTheDocument();

            expect(
                screen.queryByRole('heading', {
                    name: 'Inicio de sesión',
                }),
            ).not.toBeInTheDocument();
        },
    );

    it(
        'bloquea el panel sin autenticación',
        async () => {
            renderProtectedRoute();

            expect(
                await screen.findByRole('heading', {
                    name: 'Inicio de sesión',
                }),
            ).toBeInTheDocument();

            expect(
                screen.queryByRole('heading', {
                    name: 'Panel privado',
                }),
            ).not.toBeInTheDocument();
        },
    );

    it(
        'bloquea una cuenta sin correo verificado',
        async () => {
            authMock.status = 'email-unverified';

            renderProtectedRoute();

            expect(
                await screen.findByRole('heading', {
                    name: 'Inicio de sesión',
                }),
            ).toBeInTheDocument();

            expect(
                screen.queryByRole('heading', {
                    name: 'Panel privado',
                }),
            ).not.toBeInTheDocument();
        },
    );

    it(
        'no muestra contenido privado mientras comprueba la sesión',
        () => {
            authMock.status = 'loading';

            renderProtectedRoute();

            expect(
                screen.getByRole('status'),
            ).toHaveTextContent(
                'Comprobando sesión...',
            );

            expect(
                screen.getByRole('main'),
            ).toHaveAttribute(
                'aria-busy',
                'true',
            );

            expect(
                screen.queryByRole('heading', {
                    name: 'Panel privado',
                }),
            ).not.toBeInTheDocument();
        },
    );

    it(
        'bloquea el acceso si falla la inicialización y permite reintentar',
        () => {
            authMock.status = 'error';

            renderProtectedRoute();

            expect(
                screen.getByRole('alert'),
            ).toHaveTextContent(
                'Las funciones privadas permanecen bloqueadas.',
            );

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Reintentar',
                }),
            );

            expect(
                authMock.retryInitialization,
            ).toHaveBeenCalledTimes(1);

            expect(
                screen.queryByRole('heading', {
                    name: 'Panel privado',
                }),
            ).not.toBeInTheDocument();
        },
    );

    it(
        'deniega por defecto un estado de sesión inesperado',
        async () => {
            /*
             * Caso de regresión:
             *
             * La implementación antigua
             * mostraba Outlet para cualquier
             * estado que no tuviera un
             * tratamiento explícito.
             */
            authMock.status = 'estado-desconocido';

            renderProtectedRoute();

            expect(
                await screen.findByRole('heading', {
                    name: 'Inicio de sesión',
                }),
            ).toBeInTheDocument();

            expect(
                screen.queryByRole('heading', {
                    name: 'Panel privado',
                }),
            ).not.toBeInTheDocument();
        },
    );

    it(
        'conserva la ruta privada solicitada para volver tras iniciar sesión',
        async () => {
            renderProtectedRoute(
                '/tareas/pendientes?estado=pendiente#lista',
            );

            expect(
                await screen.findByTestId('return-path'),
            ).toHaveTextContent(
                '/tareas/pendientes?estado=pendiente#lista',
            );

            expect(
                screen.queryByRole('heading', {
                    name: 'Tareas pendientes',
                }),
            ).not.toBeInTheDocument();
        },
    );
});
