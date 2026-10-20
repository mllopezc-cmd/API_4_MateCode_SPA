import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type {
    User,
    UserCredential,
} from 'firebase/auth';
import type {
    AuthContextType,
    AuthStatus,
} from '../src/context/AuthContext';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../src/context/AuthProvider', async () => {
    const React = await import('react');
    const { AuthContext } = await import(
        '../src/context/AuthContext'
    );

    function TestAuthProvider({
        children,
    }: {
        children: ReactNode;
    }) {
        const [status, setStatus] =
            React.useState<AuthStatus>('unauthenticated');

        const [user, setUser] = React.useState<User | null>(null);

        const login: AuthContextType['login'] = async () => {
            const testUser = {
                uid: 'test-user',
                email: 'test@example.com',
                emailVerified: true,
            } as User;

            setUser(testUser);
            setStatus('authenticated');

            return {
                user: testUser,
            } as UserCredential;
        };

        const logout: AuthContextType['logout'] = async () => {
            setUser(null);
            setStatus('unauthenticated');
        };

        const value: AuthContextType = {
            status,
            user,
            error: null,
            isAuthenticated: status === 'authenticated',
            login,
            logout,
            sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
            refreshUser: vi.fn().mockResolvedValue(undefined),
            retryInitialization: () => {
                setUser(null);
                setStatus('unauthenticated');
            },
        };

        return React.createElement(
            AuthContext.Provider,
            { value },
            children,
        );
    }

    return { AuthProvider: TestAuthProvider };
});

vi.mock('../src/services/firestoreTaskService', () => ({
    createFirestoreTask: vi.fn().mockResolvedValue({
        id: 'test-task',
        title: 'Tarea de prueba',
        description: '',
        status: 'pendiente',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        startDate: null,
        dueDate: null,
    }),

    getAllFirestoreTasks: vi.fn().mockResolvedValue([]),

    updateFirestoreTask: vi.fn().mockResolvedValue({
        id: 'test-task',
        title: 'Tarea de prueba',
        description: '',
        status: 'pendiente',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        startDate: null,
        dueDate: null,
    }),

    deleteFirestoreTask: vi.fn().mockResolvedValue(undefined),
}));

import { AppRoutes } from '../src/App';

function LocationProbe() {
    const location = useLocation();

    return (
        <output data-testid="current-location">
            {location.pathname}
            {location.search}
            {location.hash}
        </output>
    );
}

function renderApp(path = '/') {
    window.history.replaceState({}, '', '/');

    return render(
        <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
            <LocationProbe />
        </MemoryRouter>,
    );
}

function renderLoginWithReturnTo(from: unknown) {
    return render(
        <MemoryRouter
            initialEntries={[
                {
                    pathname: '/iniciar-sesion',
                    state: { from },
                },
            ]}
        >
            <AppRoutes />
            <LocationProbe />
        </MemoryRouter>,
    );
}

async function loginThroughForm() {
    fireEvent.change(
        screen.getByLabelText('Correo electrónico'),
        {
            target: { value: 'test@example.com' },
        },
    );

    fireEvent.change(
        screen.getByLabelText('Contraseña'),
        {
            target: { value: 'Password123!' },
        },
    );

    await act(async () => {
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Iniciar sesión',
            }),
        );
    });
}

describe('Rutas públicas de MateCode', () => {
    it('muestra la página de inicio', () => {
        renderApp('/');

        expect(
            screen.getByRole('heading', { name: 'MateCode' }),
        ).toBeInTheDocument();
    });

    it('permite acceder a Ayuda sin iniciar sesión', () => {
        renderApp('/ayuda');

        expect(
            screen.getByRole('heading', { name: 'Ayuda de MateCode' }),
        ).toBeInTheDocument();
    });

    it('permite acceder a Acerca de', () => {
        renderApp('/acerca-de');

        expect(
            screen.getByRole('heading', { name: 'Acerca de MateCode' }),
        ).toBeInTheDocument();
    });

    it('permite acceder a Contacto', () => {
        renderApp('/contacto');

        expect(
            screen.getByRole('heading', { name: 'Contacto' }),
        ).toBeInTheDocument();
    });

    it('permite acceder a Crear cuenta', () => {
        renderApp('/crear-cuenta');

        expect(
            screen.getByRole('heading', { name: 'Crear cuenta' }),
        ).toBeInTheDocument();
    });
});

describe('Protección de rutas privadas', () => {
    it('redirige al inicio de sesión al solicitar el panel sin sesión', () => {
        renderApp('/panel');

        expect(
            screen.getByRole('heading', { name: 'Iniciar sesión' }),
        ).toBeInTheDocument();
    });

    it('redirige a iniciar sesión al solicitar tareas sin sesión', () => {
        renderApp('/tareas/pendientes');

        expect(
            screen.getByRole('heading', { name: 'Iniciar sesión' }),
        ).toBeInTheDocument();
    });

    it('permite entrar al panel después del inicio de sesión', async () => {
        renderApp('/iniciar-sesion');

        await loginThroughForm();

        expect(
            await screen.findByRole('heading', {
                name: 'Panel principal',
            }),
        ).toBeInTheDocument();

        expect(screen.getByTestId('current-location')).toHaveTextContent(
            '/panel',
        );
    });

    it('regresa a la ruta privada solicitada después del inicio de sesión', async () => {
        renderApp('/tareas/pendientes');

        await loginThroughForm();

        await waitFor(() => {
            expect(
                screen.getByTestId('current-location'),
            ).toHaveTextContent('/tareas/pendientes');
        });
    });

    it('conserva los parámetros y el fragmento de una ruta privada válida', async () => {
        renderLoginWithReturnTo({
            pathname: '/tareas',
            search: '?estado=pendiente',
            hash: '#lista',
        });

        await loginThroughForm();

        await waitFor(() => {
            expect(
                screen.getByTestId('current-location'),
            ).toHaveTextContent('/tareas?estado=pendiente#lista');
        });
    });

    it('usa el panel como alternativa si el destino es una ruta pública', async () => {
        renderLoginWithReturnTo({
            pathname: '/ayuda',
        });

        await loginThroughForm();

        expect(
            await screen.findByRole('heading', {
                name: 'Panel principal',
            }),
        ).toBeInTheDocument();

        expect(screen.getByTestId('current-location')).toHaveTextContent(
            '/panel',
        );
    });

    it('usa el panel como alternativa si el destino es desconocido', async () => {
        renderLoginWithReturnTo({
            pathname: '/ruta-inexistente',
        });

        await loginThroughForm();

        expect(
            await screen.findByRole('heading', {
                name: 'Panel principal',
            }),
        ).toBeInTheDocument();

        expect(screen.getByTestId('current-location')).toHaveTextContent(
            '/panel',
        );
    });

    it('usa el panel como alternativa si el destino no tiene una ruta válida', async () => {
        renderLoginWithReturnTo({
            pathname: '//sitio-externo.example',
        });

        await loginThroughForm();

        await waitFor(() => {
            expect(
                screen.getByTestId('current-location'),
            ).toHaveTextContent('/panel');
        });
    });

    it('permite acceder a Ayuda desde una sesión autenticada', async () => {
        renderApp('/iniciar-sesion');

        await loginThroughForm();

        await screen.findByRole('heading', {
            name: 'Panel principal',
        });

        // El mock de Firestore devuelve una lista vacía y evita
        // depender de una conexión real para probar la navegación.
        await waitFor(() => {
            expect(
                screen.queryByRole('heading', {
                    name: 'Cargando tus tareas',
                }),
            ).not.toBeInTheDocument();

            expect(
                screen.queryByRole('heading', {
                    name: 'No se pudieron cargar las tareas',
                }),
            ).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('link', { name: 'Ayuda' }));

        expect(
            await screen.findByRole('heading', {
                name: 'Ayuda de MateCode',
            }),
        ).toBeInTheDocument();
    });

    it('cierra la sesión y redirige al inicio de sesión', async () => {
        renderApp('/iniciar-sesion');

        await loginThroughForm();

        expect(
            await screen.findByRole('heading', {
                name: 'Panel principal',
            }),
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: 'Cerrar sesión' }),
        );

        expect(
            await screen.findByRole('heading', {
                name: 'Iniciar sesión',
            }),
        ).toBeInTheDocument();
    });

    it('muestra una página no encontrada para una ruta desconocida', () => {
        renderApp('/ruta-inexistente');

        expect(
            screen.getByRole('heading', { name: 'Página no encontrada' }),
        ).toBeInTheDocument();
    });

    it('usa el panel como alternativa si search tiene un formato inválido', async () => {
        renderLoginWithReturnTo({
            pathname: '/tareas',
            search: 'estado=pendiente',
        });

        await loginThroughForm();

        await waitFor(() => {
            expect(
                screen.getByTestId('current-location'),
            ).toHaveTextContent('/panel');
        });
    });

    it('usa el panel como alternativa si hash tiene un formato inválido', async () => {
        renderLoginWithReturnTo({
            pathname: '/tareas',
            hash: 'lista',
        });

        await loginThroughForm();

        await waitFor(() => {
            expect(
                screen.getByTestId('current-location'),
            ).toHaveTextContent('/panel');
        });
    });

    it('impide volver al panel protegido después de cerrar sesión', async () => {
        renderApp('/iniciar-sesion');

        await loginThroughForm();

        expect(
            await screen.findByRole('heading', {
                name: 'Panel principal',
            }),
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: 'Cerrar sesión' }),
        );

        expect(
            await screen.findByRole('heading', {
                name: 'Iniciar sesión',
            }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('heading', {
                name: 'Panel principal',
            }),
        ).not.toBeInTheDocument();
    });
});
