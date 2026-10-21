import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import DashboardPage from '../src/pages/DashboardPage';
import { useAuth } from '../src/context/AuthContext';
import { getAllFirestoreTasks } from '../src/services/firestoreTaskService';
import type { Task } from '../src/types/task';

const { mockLogout } = vi.hoisted(() => ({
    mockLogout: vi.fn(),
}));

vi.mock('../src/context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../src/services/firestoreTaskService', () => ({
    getAllFirestoreTasks: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockGetAllFirestoreTasks = vi.mocked(getAllFirestoreTasks);

function createTask(overrides: Partial<Task> = {}): Task {
    const now = new Date();
    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
    ].join('-');

    return {
        id: 'task-1',
        title: 'Tarea de prueba',
        description: 'Descripción de prueba',
        status: 'pendiente',
        createdAt: `${today}T09:00:00.000Z`,
        updatedAt: `${today}T09:00:00.000Z`,
        startDate: null,
        dueDate: today,
        ...overrides,
    };
}

function LocationProbe() {
    const location = useLocation();

    return <output aria-label="Ruta actual">{location.pathname}</output>;
}

function renderDashboard() {
    return render(
        <MemoryRouter initialEntries={['/panel']}>
            <LocationProbe />
            <DashboardPage />
        </MemoryRouter>,
    );
}

function setAuthenticatedUser() {
    mockUseAuth.mockReturnValue({
        status: 'authenticated',
        user: {
            uid: 'test-user',
            emailVerified: true,
        },
        logout: mockLogout,
    } as never);
}

describe('DashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLogout.mockResolvedValue(undefined);
        setAuthenticatedUser();
        mockGetAllFirestoreTasks.mockResolvedValue([]);
    });

    afterEach(() => {
        cleanup();
    });

    it('muestra los contadores en cero cuando no hay tareas', async () => {
        renderDashboard();

        expect(
            await screen.findByRole('heading', {
                name: 'Resumen de tareas',
            }),
        ).toBeInTheDocument();

        const summary = screen.getByRole('region', {
            name: 'Resumen de tareas',
        });

        expect(summary).toHaveTextContent('Total de tareas');
        expect(summary).toHaveTextContent('Pendientes');
        expect(summary).toHaveTextContent('En progreso');
        expect(summary).toHaveTextContent('Completadas');

        expect(summary).toHaveTextContent('Total de tareas0');
        expect(summary).toHaveTextContent('Pendientes0');
        expect(summary).toHaveTextContent('En progreso0');
        expect(summary).toHaveTextContent('Completadas0');

        expect(
            screen.getByRole('link', { name: 'Crear mi primera tarea' }),
        ).toHaveAttribute('href', '/tareas');

        expect(mockGetAllFirestoreTasks).toHaveBeenCalledTimes(1);
    });

    it('calcula correctamente los contadores por estado', async () => {
        mockGetAllFirestoreTasks.mockResolvedValue([
            createTask({ id: '1', status: 'pendiente' }),
            createTask({ id: '2', status: 'pendiente' }),
            createTask({ id: '3', status: 'en_progreso' }),
            createTask({ id: '4', status: 'completada' }),
        ]);

        renderDashboard();

        const summary = await screen.findByRole('region', {
            name: 'Resumen de tareas',
        });

        expect(summary).toHaveTextContent('Total de tareas4');
        expect(summary).toHaveTextContent('Pendientes2');
        expect(summary).toHaveTextContent('En progreso1');
        expect(summary).toHaveTextContent('Completadas1');
    });

    it('ordena las próximas tareas por fecha límite, incluidas las completadas', async () => {
        mockGetAllFirestoreTasks.mockResolvedValue([
            createTask({
                id: 'late',
                title: 'Tarea posterior',
                dueDate: '2099-12-20',
            }),
            createTask({
                id: 'early',
                title: 'Tarea anterior',
                dueDate: '2099-12-01',
            }),
            createTask({
                id: 'middle',
                title: 'Tarea intermedia',
                dueDate: '2099-12-10',
                status: 'completada',
            }),
            createTask({
                id: 'without-date',
                title: 'Tarea sin fecha',
                dueDate: null,
            }),
        ]);

        renderDashboard();

        const upcomingHeading = await screen.findByRole('heading', {
            name: 'Próximas tareas',
        });

        const upcomingSection = upcomingHeading.closest('section');

        if (!upcomingSection) {
            throw new Error('No se encontró la sección de próximas tareas');
        }

        const list = upcomingSection.querySelector<HTMLElement>(
            '.dashboard-upcoming-list',
        );

        if (!list) {
            throw new Error('No se encontró la lista de próximas tareas');
        }

        const upcomingList = within(list);

        expect(
            upcomingList.getByRole('link', { name: 'Tarea anterior' }),
        ).toBeInTheDocument();

        expect(
            upcomingList.getByRole('link', { name: 'Tarea intermedia' }),
        ).toBeInTheDocument();

        expect(
            upcomingList.getByRole('link', { name: 'Tarea posterior' }),
        ).toBeInTheDocument();

        expect(
            upcomingList.getByRole('link', {
                name: 'Tarea sin fecha',
            }),
        ).toBeInTheDocument();

        expect(
            upcomingList.getByText(/Sin fecha programada/),
        ).toBeInTheDocument();

        const taskLinks = Array.from(list.querySelectorAll('a')).map(
            (link) => link.textContent,
        );

        expect(taskLinks).toEqual([
            'Tarea anterior',
            'Tarea intermedia',
            'Tarea posterior',
            'Tarea sin fecha',
        ]);
    });

    it('muestra como máximo cinco próximas tareas', async () => {
        mockGetAllFirestoreTasks.mockResolvedValue(
            Array.from({ length: 7 }, (_, index) =>
                createTask({
                    id: `task-${index + 1}`,
                    title: `Tarea ${index + 1}`,
                    dueDate: `2099-12-${String(index + 1).padStart(2, '0')}`,
                }),
            ),
        );

        renderDashboard();

        expect(
            await screen.findByRole('link', { name: 'Tarea 1' }),
        ).toBeInTheDocument();

        const upcomingHeading = screen.getByRole('heading', {
            name: 'Próximas tareas',
        });

        const section = upcomingHeading.closest('section');

        expect(section).not.toBeNull();

        expect(
            section!.querySelectorAll('.dashboard-upcoming-list li'),
        ).toHaveLength(5);

        expect(
            screen.queryByRole('link', { name: 'Tarea 6' }),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByRole('link', { name: 'Tarea 7' }),
        ).not.toBeInTheDocument();
    });

    it('cierra la sesión, deshabilita el botón durante la operación y navega al finalizar', async () => {
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

        expect(
            screen.getByRole('button', { name: 'Cerrando sesión…' }),
        ).toBeDisabled();

        expect(mockLogout).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveLogout();
        });

        await waitFor(() => {
            expect(screen.getByLabelText('Ruta actual')).toHaveTextContent(
                '/iniciar-sesion',
            );
        });
    });

    it('muestra un error accesible y permite reintentar el cierre de sesión', async () => {
        mockLogout
            .mockRejectedValueOnce(new Error('Fallo de cierre'))
            .mockResolvedValueOnce(undefined);

        renderDashboard();

        fireEvent.click(
            screen.getByRole('button', { name: 'Cerrar sesión' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'No se pudo cerrar la sesión. Inténtalo de nuevo.',
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Cerrar sesión' }),
        );

        await waitFor(() => {
            expect(mockLogout).toHaveBeenCalledTimes(2);
        });

        await waitFor(() => {
            expect(screen.getByLabelText('Ruta actual')).toHaveTextContent(
                '/iniciar-sesion',
            );
        });
    });

    it('muestra las tareas completadas con fecha límite', async () => {
        mockGetAllFirestoreTasks.mockResolvedValue([
            createTask({
                id: 'completed-task',
                title: 'Tarea completada con fecha',
                status: 'completada',
                dueDate: '2099-12-15',
            }),
        ]);

        renderDashboard();

        expect(
            await screen.findByRole('link', {
                name: 'Tarea completada con fecha',
            }),
        ).toBeInTheDocument();

        expect(screen.getByText(/Fecha límite:/)).toBeInTheDocument();

        expect(
            screen.getByText(/Fecha límite:.* · Completada/),
        ).toBeInTheDocument();

        expect(
            screen.queryByText(/Completada · Fecha límite:/),
        ).not.toBeInTheDocument();
    });

    it('muestra un error accesible cuando falla la carga de Firestore', async () => {
        mockGetAllFirestoreTasks.mockRejectedValue(
            new Error('Error de lectura de Firestore'),
        );

        renderDashboard();

        expect(
            await screen.findByRole('heading', {
                name: 'No se pudieron cargar las tareas',
            }),
        ).toBeInTheDocument();

        expect(screen.getByRole('alert')).toHaveTextContent(
            'No se pudieron cargar tus tareas desde Firestore.',
        );

        expect(
            screen.getByRole('button', { name: 'Reintentar carga' }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('heading', { name: 'Resumen de tareas' }),
        ).not.toBeInTheDocument();
    });

    it('recupera las tareas al reintentar una carga fallida', async () => {
        mockGetAllFirestoreTasks
            .mockRejectedValueOnce(new Error('Error temporal'))
            .mockResolvedValueOnce([
                createTask({
                    id: 'recovered',
                    title: 'Tarea recuperada',
                    dueDate: '2099-12-15',
                }),
            ]);

        renderDashboard();

        expect(
            await screen.findByRole('heading', {
                name: 'No se pudieron cargar las tareas',
            }),
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: 'Reintentar carga' }),
        );

        expect(
            await screen.findByRole('link', { name: 'Tarea recuperada' }),
        ).toBeInTheDocument();

        expect(mockGetAllFirestoreTasks).toHaveBeenCalledTimes(2);
    });

    it('no consulta Firestore si el usuario no está autenticado', async () => {
        mockUseAuth.mockReturnValue({
            status: 'unauthenticated',
            user: null,
            logout: mockLogout,
        } as never);

        renderDashboard();

        expect(
            await screen.findByRole('heading', {
                name: 'Verifica tu acceso',
            }),
        ).toBeInTheDocument();

        expect(mockGetAllFirestoreTasks).not.toHaveBeenCalled();

        expect(
            screen.queryByRole('heading', { name: 'Resumen de tareas' }),
        ).not.toBeInTheDocument();
    });

    it('no consulta Firestore si el correo del usuario no está verificado', async () => {
        mockUseAuth.mockReturnValue({
            status: 'email-unverified',
            user: {
                uid: 'test-user',
                emailVerified: false,
            },
            logout: mockLogout,
        } as never);

        renderDashboard();

        expect(
            await screen.findByRole('heading', {
                name: 'Verifica tu acceso',
            }),
        ).toBeInTheDocument();

        expect(mockGetAllFirestoreTasks).not.toHaveBeenCalled();
    });

    it('muestra las tareas sin fecha y conserva sus estados', async () => {
        mockGetAllFirestoreTasks.mockResolvedValue([
            createTask({
                id: 'undated-pending',
                title: 'Pendiente sin fecha',
                status: 'pendiente',
                dueDate: null,
            }),
            createTask({
                id: 'undated-done',
                title: 'Completada sin fecha',
                status: 'completada',
                dueDate: null,
            }),
        ]);

        renderDashboard();

        const heading = await screen.findByRole('heading', {
            name: 'Próximas tareas',
        });

        const section = heading.closest('section');
        expect(section).not.toBeNull();

        const list = within(section!);

        expect(
            list.getByRole('link', {
                name: 'Pendiente sin fecha',
            }),
        ).toBeInTheDocument();

        expect(
            list.getByRole('link', {
                name: 'Completada sin fecha',
            }),
        ).toBeInTheDocument();

        expect(
            list.getByText('Sin fecha programada · Pendiente'),
        ).toBeInTheDocument();

        const completedTaskItem = list
            .getByRole('link', {
                name: 'Completada sin fecha',
            })
            .closest('li');

        expect(completedTaskItem).not.toBeNull();

        expect(completedTaskItem).toHaveTextContent(
            'Sin fecha programada',
        );

        expect(completedTaskItem).toHaveTextContent(
            'Completada',
        );

        expect(
            list.queryByText(
                /Completada · Sin fecha programada · Completada/,
            ),
        ).not.toBeInTheDocument();
    });

    it('mantiene el límite de cinco y prioriza las tareas con fecha', async () => {
        mockGetAllFirestoreTasks.mockResolvedValue([
            ...Array.from({ length: 5 }, (_, index) =>
                createTask({
                    id: `undated-${index}`,
                    title: `Sin fecha ${index}`,
                    dueDate: null,
                }),
            ),
            createTask({
                id: 'dated',
                title: 'Con fecha próxima',
                dueDate: '2099-12-01',
            }),
        ]);

        renderDashboard();

        const heading = await screen.findByRole('heading', {
            name: 'Próximas tareas',
        });

        const section = heading.closest('section');
        expect(section).not.toBeNull();

        expect(
            section!.querySelectorAll('.dashboard-upcoming-list li'),
        ).toHaveLength(5);

        expect(
            within(section!).getByRole('link', {
                name: 'Con fecha próxima',
            }),
        ).toBeInTheDocument();
    });
});