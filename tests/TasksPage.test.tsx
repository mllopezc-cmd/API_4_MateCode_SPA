import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TasksPage from '../src/pages/tasks/TasksPage';
import type { Task } from '../src/types/task';
import { formatCalendarDate } from '../src/utils/dateFormatting';

const { authState, firestoreMocks } = vi.hoisted(() => ({
    authState: {
        status: 'authenticated' as
            | 'loading'
            | 'unauthenticated'
            | 'email-unverified'
            | 'authenticated'
            | 'error',
        user: {
            uid: 'test-user-123',
            email: 'test@example.com',
            emailVerified: true,
        },
        error: null as Error | null,
    },
    firestoreMocks: {
        createFirestoreTask: vi.fn(),
        deleteFirestoreTask: vi.fn(),
        getAllFirestoreTasks: vi.fn(),
        updateFirestoreTask: vi.fn(),
    },
}));

vi.mock('../src/context/AuthContext', () => ({
    useAuth: () => authState,
}));

vi.mock('../src/services/firestoreTaskService', () => ({
    createFirestoreTask: firestoreMocks.createFirestoreTask,
    deleteFirestoreTask: firestoreMocks.deleteFirestoreTask,
    getAllFirestoreTasks: firestoreMocks.getAllFirestoreTasks,
    updateFirestoreTask: firestoreMocks.updateFirestoreTask,
}));

let storedTasks: Task[];

function getDateInDays(daysFromToday: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function createTask(overrides: Partial<Task> = {}): Task {
    const now = new Date().toISOString();

    return {
        id: `task-${Math.random().toString(36).slice(2)}`,
        title: 'Tarea de prueba',
        description: '',
        status: 'pendiente',
        createdAt: now,
        updatedAt: now,
        startDate: null,
        dueDate: null,
        ...overrides,
    };
}

function renderTasksPage(path = '/tareas') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <TasksPage />
        </MemoryRouter>,
    );
}

function fillTitle(title: string) {
    fireEvent.change(screen.getByLabelText('Título *'), {
        target: { value: title },
    });
}

async function submitNewTask(title: string) {
    fillTitle(title);

    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

    await waitFor(() => {
        expect(firestoreMocks.createFirestoreTask).toHaveBeenCalled();
    });
}

beforeEach(() => {
    storedTasks = [];

    authState.status = 'authenticated';
    authState.user = {
        uid: 'test-user-123',
        email: 'test@example.com',
        emailVerified: true,
    };
    authState.error = null;

    vi.clearAllMocks();

    firestoreMocks.getAllFirestoreTasks.mockImplementation(async () =>
        storedTasks.map((task) => ({ ...task })),
    );

    firestoreMocks.createFirestoreTask.mockImplementation(
        async (input: Partial<Task>) => {
            const task = createTask({
                title: input.title ?? '',
                description: input.description ?? '',
                status: input.status ?? 'pendiente',
                startDate: input.startDate ?? null,
                dueDate: input.dueDate ?? null,
            });

            storedTasks.push(task);
            return { ...task };
        },
    );

    firestoreMocks.updateFirestoreTask.mockImplementation(
        async (taskId: string, patch: Partial<Task>) => {
            const index = storedTasks.findIndex(
                (task) => task.id === taskId,
            );

            if (index < 0) {
                throw new Error('La tarea no existe.');
            }

            storedTasks[index] = {
                ...storedTasks[index],
                ...patch,
                updatedAt: new Date().toISOString(),
            };

            return { ...storedTasks[index] };
        },
    );

    firestoreMocks.deleteFirestoreTask.mockImplementation(
        async (taskId: string) => {
            storedTasks = storedTasks.filter(
                (task) => task.id !== taskId,
            );
        },
    );
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Interfaz de gestión de tareas', () => {
    it('muestra el formulario y el mensaje cuando no hay tareas', async () => {
        renderTasksPage();

        expect(
            screen.getByRole('heading', { name: 'Crear una tarea' }),
        ).toBeInTheDocument();

        expect(
            await screen.findByText('Todavía no tienes tareas'),
        ).toBeInTheDocument();

        expect(screen.getByText('0 tareas encontradas')).toBeInTheDocument();
    });

    it('no confunde un fallo de lectura inicial con una lista vacía', async () => {
        firestoreMocks.getAllFirestoreTasks.mockRejectedValueOnce(
            new Error('Fallo de lectura simulado.'),
        );

        renderTasksPage();

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Fallo de lectura simulado.',
        );

        expect(
            screen.queryByText('Todavía no tienes tareas'),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByText('0 tareas encontradas'),
        ).not.toBeInTheDocument();

        expect(
            screen.getByRole('button', { name: 'Reintentar carga' }),
        ).toBeInTheDocument();
    });

    it('recupera la lista cuando se reintenta una lectura fallida', async () => {
        firestoreMocks.getAllFirestoreTasks
            .mockRejectedValueOnce(new Error('Fallo temporal de lectura.'))
            .mockResolvedValueOnce([]);

        renderTasksPage();

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Fallo temporal de lectura.',
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Reintentar carga' }),
        );

        await waitFor(() => {
            expect(
                screen.queryByRole('alert'),
            ).not.toBeInTheDocument();
        });

        expect(
            screen.getByText('0 tareas encontradas'),
        ).toBeInTheDocument();

        expect(
            screen.getByText('Todavía no tienes tareas'),
        ).toBeInTheDocument();

        expect(
            firestoreMocks.getAllFirestoreTasks,
        ).toHaveBeenCalledTimes(2);
    });

    it('muestra un error cuando falla la carga inicial y permite reintentar', async () => {
        firestoreMocks.getAllFirestoreTasks
            .mockRejectedValueOnce(new Error('Fallo de recarga simulado.'))
            .mockResolvedValueOnce([]);

        renderTasksPage();

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Fallo de recarga simulado.',
        );

        expect(
            screen.getByText('No se pudo cargar la lista de tareas'),
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: 'Reintentar carga' }),
        );

        expect(
            await screen.findByText('Todavía no tienes tareas'),
        ).toBeInTheDocument();
    });

    it('no comunica éxito cuando falla la escritura de una tarea', async () => {
        firestoreMocks.createFirestoreTask.mockRejectedValueOnce(
            new Error('Fallo de escritura simulado.'),
        );

        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        fillTitle('Tarea que no se guardó');

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Fallo de escritura simulado.',
        );

        expect(
            screen.queryByText('La tarea se creó correctamente.'),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByRole('heading', {
                name: 'Tarea que no se guardó',
            }),
        ).not.toBeInTheDocument();
    });

    it('crea una tarea y la muestra en el listado', async () => {
        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        fillTitle('Estudiar React');

        fireEvent.change(
            screen.getByLabelText('Descripción (opcional)'),
            {
                target: { value: 'Repasar componentes' },
            },
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        expect(
            await screen.findByRole('heading', {
                name: 'Estudiar React',
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByText('Repasar componentes'),
        ).toBeInTheDocument();

        expect(
            firestoreMocks.createFirestoreTask,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Estudiar React',
                description: 'Repasar componentes',
            }),
        );
    });

    it('crea una tarea con fechas de inicio y límite válidas', async () => {
        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        const startDate = getDateInDays(1);
        const dueDate = getDateInDays(5);

        fillTitle('Tarea planificada');

        fireEvent.change(
            screen.getByLabelText(
                'Fecha de inicio planificada (opcional)',
            ),
            { target: { value: startDate } },
        );

        fireEvent.change(
            screen.getByLabelText(/fecha límite/i),
            { target: { value: dueDate } },
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        expect(
            await screen.findByText(
                `Inicio planificado: ${formatCalendarDate(startDate)}`,
            ),
        ).toBeInTheDocument();

        expect(
            firestoreMocks.createFirestoreTask,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Tarea planificada',
                startDate,
                dueDate,
            }),
        );
    });

    it('rechaza una fecha de inicio pasada al crear una tarea', async () => {
        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        fillTitle('Tarea con inicio pasado');

        fireEvent.change(
            screen.getByLabelText(
                'Fecha de inicio planificada (opcional)',
            ),
            { target: { value: getDateInDays(-1) } },
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'La fecha de inicio debe ser hoy o una fecha futura.',
        );

        expect(
            firestoreMocks.createFirestoreTask,
        ).not.toHaveBeenCalled();
    });

    it('rechaza una fecha límite anterior a la fecha de inicio', async () => {
        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        fillTitle('Tarea con fechas incompatibles');

        fireEvent.change(
            screen.getByLabelText(
                'Fecha de inicio planificada (opcional)',
            ),
            { target: { value: getDateInDays(5) } },
        );

        fireEvent.change(
            screen.getByLabelText(/fecha límite/i),
            { target: { value: getDateInDays(2) } },
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'La fecha límite debe ser igual o posterior a la fecha de inicio.',
        );

        expect(
            firestoreMocks.createFirestoreTask,
        ).not.toHaveBeenCalled();
    });

    it('permite editar una tarea existente', async () => {
        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        fillTitle('Tarea original');

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        await screen.findByRole('heading', { name: 'Tarea original' });

        fireEvent.click(
            screen.getByRole('button', { name: /^Editar$/ }),
        );

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea modificada' },
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        expect(
            await screen.findByRole('heading', {
                name: 'Tarea modificada',
            }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('heading', { name: 'Tarea original' }),
        ).not.toBeInTheDocument();

        expect(
            firestoreMocks.updateFirestoreTask,
        ).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ title: 'Tarea modificada' }),
        );
    });

    it('permite editar la fecha de inicio de una tarea existente', async () => {
        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        const originalStartDate = getDateInDays(1);
        const updatedStartDate = getDateInDays(2);

        fillTitle('Tarea para reprogramar');

        fireEvent.change(
            screen.getByLabelText(
                'Fecha de inicio planificada (opcional)',
            ),
            { target: { value: originalStartDate } },
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        await screen.findByRole('heading', {
            name: 'Tarea para reprogramar',
        });

        fireEvent.click(
            screen.getByRole('button', { name: /^Editar$/ }),
        );

        const startDateInput = screen.getByLabelText(
            'Fecha de inicio planificada (opcional)',
        ) as HTMLInputElement;

        expect(startDateInput.value).toBe(originalStartDate);

        fireEvent.change(startDateInput, {
            target: { value: updatedStartDate },
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        expect(
            await screen.findByText(
                `Inicio planificado: ${formatCalendarDate(updatedStartDate)}`,
            ),
        ).toBeInTheDocument();

        expect(
            firestoreMocks.updateFirestoreTask,
        ).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                startDate: updatedStartDate,
            }),
        );
    });

    it('actualiza el estado visual antes de la respuesta de Firestore', async () => {
        const originalTask = createTask({
            id: 'optimistic-task',
            title: 'Tarea optimista',
        });

        storedTasks = [originalTask];

        let resolveUpdate!: (task: Task) => void;

        firestoreMocks.updateFirestoreTask.mockImplementationOnce(
            () =>
                new Promise<Task>((resolve) => {
                    resolveUpdate = resolve;
                }),
        );

        renderTasksPage();

        const article = await screen.findByRole('article', {
            name: 'Tarea: Tarea optimista',
        });

        const statusSelect = within(article).getByRole('combobox', {
            name: 'Estado de la tarea',
        });

        fireEvent.change(statusSelect, {
            target: { value: 'en_progreso' },
        });

        expect(statusSelect).toHaveValue('en_progreso');

        expect(
            within(article).getByText('Estado: En progreso'),
        ).toBeInTheDocument();

        expect(statusSelect).not.toBeDisabled();

        expect(
            within(article).queryByText('Guardando estado…'),
        ).not.toBeInTheDocument();

        expect(
            firestoreMocks.updateFirestoreTask,
        ).toHaveBeenCalledWith(
            'optimistic-task',
            { status: 'en_progreso' },
        );

        await act(async () => {
            resolveUpdate({
                ...originalTask,
                status: 'en_progreso',
            });
        });

        expect(statusSelect).not.toBeDisabled();

        expect(
            within(article).queryByText('Guardando estado…'),
        ).not.toBeInTheDocument();

        expect(
            screen.getByText(
                'La tarea se marcó como en progreso correctamente.',
            ),
        ).toBeInTheDocument();
    });

    it('restaura el estado anterior si falla Firestore', async () => {
        storedTasks = [
            createTask({
                id: 'rollback-task',
                title: 'Tarea con fallo',
            }),
        ];

        let rejectUpdate!: (reason: Error) => void;

        firestoreMocks.updateFirestoreTask.mockImplementationOnce(
            () =>
                new Promise<Task>((_resolve, reject) => {
                    rejectUpdate = reject;
                }),
        );

        renderTasksPage();

        const article = await screen.findByRole('article', {
            name: 'Tarea: Tarea con fallo',
        });

        const statusSelect = within(article).getByRole('combobox', {
            name: 'Estado de la tarea',
        });

        fireEvent.change(statusSelect, {
            target: { value: 'completada' },
        });

        expect(statusSelect).toHaveValue('completada');

        expect(
            within(article).getByText('Estado: Completada'),
        ).toBeInTheDocument();

        await act(async () => {
            rejectUpdate(new Error('Fallo de actualización simulado.'));
        });

        expect(statusSelect).toHaveValue('pendiente');

        expect(
            within(article).getByText('Estado: Pendiente'),
        ).toBeInTheDocument();

        expect(statusSelect).not.toBeDisabled();

        expect(
            await screen.findByRole('alert'),
        ).toHaveTextContent('Fallo de actualización simulado.');
    });

    it('permite cambiar otra tarea mientras una actualización está pendiente', async () => {
        storedTasks = [
            createTask({
                id: 'slow-task',
                title: 'Tarea lenta',
            }),
            createTask({
                id: 'fast-task',
                title: 'Tarea rápida',
            }),
        ];

        let resolveSlow!: (task: Task) => void;

        firestoreMocks.updateFirestoreTask.mockImplementationOnce(
            () =>
                new Promise<Task>((resolve) => {
                    resolveSlow = resolve;
                }),
        );

        renderTasksPage();

        const slowArticle = await screen.findByRole('article', {
            name: 'Tarea: Tarea lenta',
        });

        const fastArticle = screen.getByRole('article', {
            name: 'Tarea: Tarea rápida',
        });

        const slowSelect = within(slowArticle).getByRole('combobox', {
            name: 'Estado de la tarea',
        });

        const fastSelect = within(fastArticle).getByRole('combobox', {
            name: 'Estado de la tarea',
        });

        fireEvent.change(slowSelect, {
            target: { value: 'en_progreso' },
        });

        expect(slowSelect).not.toBeDisabled();
        expect(fastSelect).not.toBeDisabled();

        fireEvent.change(fastSelect, {
            target: { value: 'completada' },
        });

        expect(fastSelect).toHaveValue('completada');

        await waitFor(() => {
            expect(
                within(fastArticle).getByText('Estado: Completada'),
            ).toBeInTheDocument();
        });

        await act(async () => {
            resolveSlow({
                ...storedTasks[0],
                status: 'en_progreso',
            });
        });

        expect(
            within(slowArticle).getByText('Estado: En progreso'),
        ).toBeInTheDocument();

        expect(
            within(fastArticle).getByText('Estado: Completada'),
        ).toBeInTheDocument();
    });

    it('conserva la última selección de estado sin bloquear el selector', async () => {
        const originalTask = createTask({
            id: 'rapid-task',
            title: 'Cambios rápidos',
            status: 'pendiente',
        });

        storedTasks = [originalTask];

        let resolveFirst!: (task: Task) => void;

        firestoreMocks.updateFirestoreTask.mockImplementationOnce(
            () => new Promise<Task>((resolve) => {
                resolveFirst = resolve;
            }),
        );

        renderTasksPage();

        const article = await screen.findByRole('article', {
            name: 'Tarea: Cambios rápidos',
        });

        const select = within(article).getByRole('combobox', {
            name: 'Estado de la tarea',
        });

        fireEvent.change(select, {
            target: { value: 'en_progreso' },
        });

        expect(select).toHaveValue('en_progreso');
        expect(select).not.toBeDisabled();

        fireEvent.change(select, {
            target: { value: 'completada' },
        });

        expect(select).toHaveValue('completada');

        expect(
            within(article).getByText('Estado: Completada'),
        ).toBeInTheDocument();

        expect(
            within(article).queryByText('Guardando estado…'),
        ).not.toBeInTheDocument();

        expect(
            firestoreMocks.updateFirestoreTask,
        ).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveFirst({
                ...originalTask,
                status: 'en_progreso',
            });
        });

        await waitFor(() => {
            expect(
                firestoreMocks.updateFirestoreTask,
            ).toHaveBeenCalledTimes(2);

            expect(
                firestoreMocks.updateFirestoreTask,
            ).toHaveBeenNthCalledWith(
                2,
                'rapid-task',
                { status: 'completada' },
            );

            expect(select).toHaveValue('completada');

            expect(
                within(article).getByText('Estado: Completada'),
            ).toBeInTheDocument();
        });
    });

    it('permite marcar una tarea como completada', async () => {
        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        fillTitle('Tarea de prueba');

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        const taskArticle = await screen.findByRole('article', {
            name: 'Tarea: Tarea de prueba',
        });

        fireEvent.change(
            within(taskArticle).getByRole('combobox', {
                name: 'Estado de la tarea',
            }),
            { target: { value: 'completada' } },
        );

        await waitFor(() => {
            expect(
                firestoreMocks.updateFirestoreTask,
            ).toHaveBeenCalledWith(
                expect.any(String),
                { status: 'completada' },
            );
        });

        expect(
            await screen.findByText('Estado: Completada'),
        ).toBeInTheDocument();
    });

    it('filtra tareas por prioridad automática', async () => {
        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        fillTitle('Tarea urgente');

        fireEvent.change(
            screen.getByLabelText(/fecha límite/i),
            { target: { value: getDateInDays(3) } },
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        await screen.findByRole('heading', { name: 'Tarea urgente' });

        fillTitle('Tarea normal');

        fireEvent.change(
            screen.getByLabelText(/fecha límite/i),
            { target: { value: getDateInDays(8) } },
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        await screen.findByRole('heading', { name: 'Tarea normal' });

        fireEvent.change(
            screen.getByLabelText('Filtrar por prioridad'),
            { target: { value: 'alta' } },
        );

        expect(
            screen.getByRole('heading', { name: 'Tarea urgente' }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('heading', { name: 'Tarea normal' }),
        ).not.toBeInTheDocument();
    });

    it('combina los filtros de estado y prioridad correctamente', async () => {
        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        const dueDate = getDateInDays(8);

        fillTitle('Tarea pendiente media');

        fireEvent.change(
            screen.getByLabelText(/fecha límite/i),
            { target: { value: dueDate } },
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        await screen.findByRole('heading', {
            name: 'Tarea pendiente media',
        });

        fillTitle('Tarea en progreso media');

        fireEvent.change(
            screen.getByLabelText(/fecha límite/i),
            { target: { value: dueDate } },
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        const inProgressTask = await screen.findByRole('article', {
            name: 'Tarea: Tarea en progreso media',
        });

        fireEvent.change(
            within(inProgressTask).getByRole('combobox', {
                name: 'Estado de la tarea',
            }),
            { target: { value: 'en_progreso' } },
        );

        await waitFor(() => {
            expect(
                firestoreMocks.updateFirestoreTask,
            ).toHaveBeenCalledWith(
                expect.any(String),
                { status: 'en_progreso' },
            );
        });

        fireEvent.change(
            screen.getByLabelText('Filtrar por estado'),
            { target: { value: 'en_progreso' } },
        );

        fireEvent.change(
            screen.getByLabelText('Filtrar por prioridad'),
            { target: { value: 'media' } },
        );

        expect(
            await screen.findByRole('heading', {
                name: 'Tarea en progreso media',
            }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('heading', {
                name: 'Tarea pendiente media',
            }),
        ).not.toBeInTheDocument();

        expect(
            screen.getByText('1 tarea encontrada'),
        ).toBeInTheDocument();
    });

    it('solicita confirmación antes de eliminar una tarea', async () => {
        const confirmSpy = vi
            .spyOn(window, 'confirm')
            .mockReturnValue(false);

        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        await submitNewTask('Tarea protegida');

        await screen.findByRole('heading', { name: 'Tarea protegida' });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Eliminar Tarea protegida',
            }),
        );

        expect(confirmSpy).toHaveBeenCalledOnce();

        expect(
            screen.getByRole('heading', { name: 'Tarea protegida' }),
        ).toBeInTheDocument();

        expect(
            firestoreMocks.deleteFirestoreTask,
        ).not.toHaveBeenCalled();
    });

    it('elimina la tarea cuando se confirma la acción', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        await submitNewTask('Tarea para eliminar');

        await screen.findByRole('heading', {
            name: 'Tarea para eliminar',
        });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Eliminar Tarea para eliminar',
            }),
        );

        await waitFor(() => {
            expect(
                firestoreMocks.deleteFirestoreTask,
            ).toHaveBeenCalledWith(expect.any(String));
        });

        await waitFor(() => {
            expect(
                screen.queryByRole('heading', {
                    name: 'Tarea para eliminar',
                }),
            ).not.toBeInTheDocument();
        });

        expect(
            screen.getByText('Todavía no tienes tareas'),
        ).toBeInTheDocument();
    });

    it('vuelve a cargar las tareas de Firestore al montar la página nuevamente', async () => {
        storedTasks = [
            createTask({
                id: 'persisted-task',
                title: 'Tarea persistente',
            }),
        ];

        const firstRender = renderTasksPage();

        expect(
            await screen.findByRole('heading', {
                name: 'Tarea persistente',
            }),
        ).toBeInTheDocument();

        firstRender.unmount();

        renderTasksPage();

        expect(
            await screen.findByRole('heading', {
                name: 'Tarea persistente',
            }),
        ).toBeInTheDocument();

        expect(
            firestoreMocks.getAllFirestoreTasks,
        ).toHaveBeenCalledTimes(2);
    });

    it('muestra el estado vacío de los filtros y permite restablecerlos', async () => {
        renderTasksPage();

        await screen.findByText('Todavía no tienes tareas');

        fillTitle('Tarea urgente');

        fireEvent.change(
            screen.getByLabelText(/fecha límite/i),
            { target: { value: getDateInDays(3) } },
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear tarea' }),
        );

        await screen.findByRole('heading', { name: 'Tarea urgente' });

        fireEvent.change(
            screen.getByLabelText('Filtrar por prioridad'),
            { target: { value: 'baja' } },
        );

        expect(
            screen.getByText('0 tareas encontradas'),
        ).toBeInTheDocument();

        expect(
            screen.getByText('No encontramos tareas'),
        ).toBeInTheDocument();

        expect(
            screen.getByText(
                /Ninguna tarea coincide con los filtros seleccionados/,
            ),
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Restablecer filtros',
            }),
        );

        expect(
            screen.getByLabelText('Filtrar por estado'),
        ).toHaveValue('todas');

        expect(
            screen.getByLabelText('Filtrar por prioridad'),
        ).toHaveValue('todas');

        expect(
            screen.getByRole('heading', { name: 'Tarea urgente' }),
        ).toBeInTheDocument();

        expect(
            screen.getByText('1 tarea encontrada'),
        ).toBeInTheDocument();
    });
});
