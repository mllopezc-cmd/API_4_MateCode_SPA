import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import type { Task } from '../src/types/task';

import type { ReactNode } from 'react';
import type {
    User,
    UserCredential,
} from 'firebase/auth';
import type { AuthContextType } from '../src/context/AuthContext';

const { mockLogout } = vi.hoisted(() => ({
    mockLogout: vi.fn(),
}));

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
        const testUser = {
            uid: 'test-user',
            email: 'test@example.com',
            emailVerified: true,
            displayName: 'Usuario de prueba',
        } as User;

        const value: AuthContextType = {
            status: 'authenticated',
            user: testUser,
            error: null,
            isAuthenticated: true,
            login: vi.fn().mockResolvedValue({
                user: testUser,
            } as UserCredential),
            logout: mockLogout,
            sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
            refreshUser: vi.fn().mockResolvedValue(undefined),
            retryInitialization: vi.fn(),
        };

        return React.createElement(
            AuthContext.Provider,
            { value },
            children,
        );
    }

    return { AuthProvider: TestAuthProvider };
});

afterEach(() => {
    vi.restoreAllMocks();
});

const STORAGE_KEY = 'matecode-tasks';

function CurrentPath() {
    const location = useLocation();

    return (
        <output data-testid="current-path">
            {location.pathname}
        </output>
    );
}

function renderDashboard() {
    render(
        <MemoryRouter initialEntries={['/panel']}>
            <CurrentPath />
            <AppRoutes />
        </MemoryRouter>,
    );
}

function createTask(
    id: string,
    title: string,
    status: Task['status'],
    dueDate: string | null,
): Task {
    return {
        id,
        title,
        description: '',
        status,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
        startDate: null,
        dueDate,
    };
}

describe('Panel principal de MateCode', () => {
    beforeEach(() => {
        localStorage.clear();
        mockLogout.mockReset();
        mockLogout.mockResolvedValue(undefined);
    });

    it('muestra todos los contadores en cero cuando no hay tareas', () => {
        renderDashboard();

        expect(
            screen.getByRole('heading', { name: 'Panel principal' }),
        ).toBeInTheDocument();

        const summary = screen.getByRole('region', {
            name: 'Resumen de tareas',
        });

        expect(summary).toHaveTextContent('Total de tareas0');
        expect(summary).toHaveTextContent('Pendientes0');
        expect(summary).toHaveTextContent('En progreso0');
        expect(summary).toHaveTextContent('Completadas0');

        expect(
            screen.getByText(/Aún no tienes tareas/),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('link', { name: 'Crear mi primera tarea' }),
        ).toHaveAttribute('href', '/tareas');
    });

    it('calcula correctamente los contadores de tareas', () => {
        const tasks = [
            createTask('1', 'Tarea pendiente', 'pendiente', null),
            createTask('2', 'Tarea en progreso', 'en_progreso', null),
            createTask('3', 'Tarea completada', 'completada', null),
            createTask('4', 'Otra tarea pendiente', 'pendiente', null),
        ];

        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

        renderDashboard();

        const summary = screen.getByRole('region', {
            name: 'Resumen de tareas',
        });

        expect(summary).toHaveTextContent('Total de tareas4');
        expect(summary).toHaveTextContent('Pendientes2');
        expect(summary).toHaveTextContent('En progreso1');
        expect(summary).toHaveTextContent('Completadas1');
    });

    it('muestra las tareas con fecha límite ordenadas por proximidad, incluidas las completadas', () => {
        const tasks = [
            createTask('1', 'Tarea futura', 'pendiente', '2026-12-20'),
            createTask('2', 'Tarea vencida', 'pendiente', '2026-09-10'),
            createTask('3', 'Tarea en progreso', 'en_progreso', '2026-10-20'),
            createTask('4', 'Tarea completada', 'completada', '2026-09-01'),
            createTask('5', 'Tarea sin fecha', 'pendiente', null),
        ];

        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

        renderDashboard();

        const upcomingSection = screen.getByRole('region', {
            name: 'Próximas tareas',
        });

        const navigation = within(upcomingSection).getByRole('navigation', {
            name: 'Navegación del panel',
        });

        const navigationLinks = new Set(
            within(navigation).getAllByRole('link'),
        );

        const taskLinks = within(upcomingSection)
            .getAllByRole('link')
            .filter((link) => !navigationLinks.has(link));

        const titles = taskLinks.map((link) => link.textContent);

        expect(titles).toEqual([
            'Tarea completada',
            'Tarea vencida',
            'Tarea en progreso',
            'Tarea futura',
        ]);

        expect(titles).not.toContain('Tarea sin fecha');
    });

    it('limita la lista de próximas tareas a cinco elementos', () => {
        const tasks = Array.from({ length: 7 }, (_, index) =>
            createTask(
                String(index + 1),
                `Tarea ${index + 1}`,
                'pendiente',
                `2026-11-${String(index + 1).padStart(2, '0')}`,
            ),
        );

        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

        renderDashboard();

        const upcomingSection = screen.getByRole('region', {
            name: 'Próximas tareas',
        });

        const navigation = within(upcomingSection).getByRole('navigation', {
            name: 'Navegación del panel',
        });

        const navigationLinks = new Set(
            within(navigation).getAllByRole('link'),
        );

        const taskLinks = within(upcomingSection)
            .getAllByRole('link')
            .filter((link) => !navigationLinks.has(link));

        expect(taskLinks).toHaveLength(5);
    });

    it('espera el cierre de sesión, deshabilita el botón y navega al completarse', async () => {
        let resolveLogout!: () => void;

        mockLogout.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveLogout = resolve;
                }),
        );

        renderDashboard();

        const logoutButton = screen.getByRole('button', {
            name: 'Cerrar sesión',
        });

        fireEvent.click(logoutButton);

        expect(mockLogout).toHaveBeenCalledOnce();
        expect(logoutButton).toBeDisabled();
        expect(logoutButton).toHaveTextContent('Cerrando sesión');

        expect(screen.getByTestId('current-path')).toHaveTextContent(
            '/panel',
        );

        resolveLogout();

        await waitFor(() => {
            expect(screen.getByTestId('current-path')).toHaveTextContent(
                '/iniciar-sesion',
            );
        });
    });

    it('muestra un error accesible y permite reintentar si falla el cierre de sesión', async () => {
        mockLogout.mockRejectedValueOnce(
            new Error('Firebase logout failed'),
        );

        renderDashboard();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Cerrar sesión',
            }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'No se pudo cerrar la sesión. Inténtalo de nuevo.',
        );

        expect(screen.getByTestId('current-path')).toHaveTextContent(
            '/panel',
        );

        const logoutButton = screen.getByRole('button', {
            name: 'Cerrar sesión',
        });

        await waitFor(() => {
            expect(logoutButton).toBeEnabled();
        });

        expect(mockLogout).toHaveBeenCalledOnce();

        fireEvent.click(logoutButton);

        await waitFor(() => {
            expect(mockLogout).toHaveBeenCalledTimes(2);
            expect(screen.getByTestId('current-path')).toHaveTextContent(
                '/iniciar-sesion',
            );
        });
    });

    it('muestra las tareas completadas con fecha aunque no haya tareas pendientes con fecha', () => {
        const tasks = [
            createTask('1', 'Tarea sin fecha', 'pendiente', null),
            createTask('2', 'Tarea terminada', 'completada', '2026-10-10'),
        ];

        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

        renderDashboard();

        expect(
            screen.getByRole('link', { name: /Tarea terminada/ }),
        ).toBeInTheDocument();

        expect(
            screen.queryByText(
                'No tienes tareas pendientes con fecha límite.',
            ),
        ).not.toBeInTheDocument();
    });

    it('muestra un error accesible si falla la lectura de tareas', () => {
        const getItemSpy = vi
            .spyOn(Storage.prototype, 'getItem')
            .mockImplementation(() => {
                throw new Error('Storage unavailable');
            });

        renderDashboard();

        expect(screen.getByRole('alert')).toHaveTextContent(
            'No se pudieron cargar las tareas',
        );

        expect(
            screen.queryByText('Total de tareas'),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByText(/Aún no tienes tareas/),
        ).not.toBeInTheDocument();

        expect(getItemSpy).toHaveBeenCalled();
    });

    it('recupera el panel cuando se reintenta una lectura fallida', () => {
        const tasks = [
            createTask('1', 'Tarea recuperada', 'pendiente', null),
        ];

        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

        const originalGetItem = Storage.prototype.getItem;
        let shouldFail = true;

        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
            function (this: Storage, key: string) {
                if (key === STORAGE_KEY && shouldFail) {
                    shouldFail = false;
                    throw new Error('Storage unavailable');
                }

                return originalGetItem.call(this, key);
            },
        );

        renderDashboard();

        expect(screen.getByRole('alert')).toHaveTextContent(
            'No se pudieron cargar las tareas',
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Reintentar carga' }),
        );

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();

        expect(
            screen.getByRole('heading', { name: 'Panel principal' }),
        ).toBeInTheDocument();

        const summary = screen.getByRole('region', {
            name: 'Resumen de tareas',
        });

        expect(summary).toHaveTextContent('Total de tareas1');
        expect(summary).toHaveTextContent('Pendientes1');
    });
});