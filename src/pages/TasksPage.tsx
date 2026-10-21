import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type {
    CreateTaskInput,
    Task,
    TaskPriority,
    TaskStatus,
} from '../types/task';
import {
    createFirestoreTask,
    deleteFirestoreTask,
    getAllFirestoreTasks,
    updateFirestoreTask,
} from '../services/firestoreTaskService';
import {
    getAutomaticPriority,
    getDueDateStatus,
} from '../utils/taskScheduling';
import { formatCalendarDate } from '../utils/dateFormatting';

const TASK_ROUTES = [
    { path: '/tareas', label: 'Todas las tareas' },
    { path: '/tareas/pendientes', label: 'Pendientes' },
    { path: '/tareas/en-progreso', label: 'En progreso' },
    { path: '/tareas/completadas', label: 'Completadas' },
    { path: '/tareas/vencidas', label: 'Vencidas' },
] as const;

type StatusFilter = TaskStatus | 'todas' | 'vencidas';
type PriorityFilter = TaskPriority | 'todas';

interface TaskForm {
    title: string;
    description: string;
    startDate: string;
    dueDate: string;
}

const EMPTY_FORM: TaskForm = {
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
    pendiente: 'Pendiente',
    en_progreso: 'En progreso',
    completada: 'Completada',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
};

const STATUS_MESSAGES: Record<TaskStatus, string> = {
    pendiente: 'La tarea se marcó como pendiente correctamente.',
    en_progreso: 'La tarea se marcó como en progreso correctamente.',
    completada: 'La tarea se marcó como completada correctamente.',
};

function getRouteStatus(pathname: string): StatusFilter {
    switch (pathname) {
        case '/tareas/pendientes':
            return 'pendiente';
        case '/tareas/en-progreso':
            return 'en_progreso';
        case '/tareas/completadas':
            return 'completada';
        case '/tareas/vencidas':
            return 'vencidas';
        default:
            return 'todas';
    }
}

function getTaskStatusMessage(task: Task): string {
    const dueDateStatus = getDueDateStatus(task);
    const statusMessage = STATUS_LABELS[task.status];

    const dueStatusMessage =
        dueDateStatus === 'vencida'
            ? ' · Vencida'
            : dueDateStatus === 'por-vencer'
                ? ' · Por vencer'
                : '';

    return task.dueDate
        ? `Estado: ${statusMessage}${dueStatusMessage} · Fecha límite: ${formatCalendarDate(task.dueDate)}`
        : `Estado: ${statusMessage}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

interface PendingStatusOperation {
    desiredStatus: TaskStatus;
    confirmedTask: Task;
}

export default function TasksPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { status, user } = useAuth();

    const isAuthenticated =
        status === 'authenticated' &&
        Boolean(user?.uid) &&
        user?.emailVerified === true;

    const userId = isAuthenticated ? user!.uid : '';

    const sessionUserIdRef = useRef(userId);
    const mountedRef = useRef(false);
    const loadRequestRef = useRef(0);

    // Controla las tareas que tienen un cambio de estado pendiente.
    const pendingStatusIdsRef = useRef<Set<string>>(new Set());
    const statusOperationsRef = useRef<
        Map<string, PendingStatusOperation>
    >(new Map());
    const [pendingStatusIds, setPendingStatusIds] = useState<Set<string>>(
        () => new Set(),
    );

    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [tasksLoadFailed, setTasksLoadFailed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState<TaskForm>({ ...EMPTY_FORM });
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const statusFilter = getRouteStatus(location.pathname);

    const [priorityFilter, setPriorityFilter] =
        useState<PriorityFilter>('todas');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const startDateError =
        error.includes('La fecha de inicio debe ser hoy o una fecha futura.')
            ? error
            : '';

    const dueDateError = error.includes(
        'La fecha límite debe ser igual o posterior a la fecha de inicio.',
    )
        ? error
        : '';

    const currentRoute = TASK_ROUTES.find(
        (route) => route.path === location.pathname,
    );

    const statusFilteredTasks = tasks.filter((task) => {
        if (statusFilter === 'todas') {
            return true;
        }

        if (statusFilter === 'vencidas') {
            return getDueDateStatus(task) === 'vencida';
        }

        return task.status === statusFilter;
    });

    const visibleTasks = statusFilteredTasks.filter(
        (task) =>
            priorityFilter === 'todas' ||
            getAutomaticPriority(task) === priorityFilter,
    );

    const hasActiveFilters =
        statusFilter !== 'todas' || priorityFilter !== 'todas';

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            loadRequestRef.current += 1;
        };
    }, []);

    useEffect(() => {
        let active = true;

        // Invalidar inmediatamente las operaciones
        // pendientes de la sesión anterior.
        sessionUserIdRef.current = userId;
        pendingStatusIdsRef.current.clear();
        statusOperationsRef.current.clear();

        // Actualizar el estado visual fuera de la
        // ejecución síncrona del efecto.
        void Promise.resolve().then(() => {
            if (
                active &&
                mountedRef.current &&
                sessionUserIdRef.current === userId
            ) {
                setPendingStatusIds(new Set());
            }
        });

        return () => {
            active = false;
        };
    }, [userId]);

    useEffect(() => {
        let active = true;
        const requestId = ++loadRequestRef.current;

        const canApplyResult = () =>
            active &&
            mountedRef.current &&
            loadRequestRef.current === requestId &&
            sessionUserIdRef.current === userId;

        async function initializeTasks() {
            // Diferir actualizaciones iniciales fuera del efecto síncrono.
            await Promise.resolve();

            if (!active) {
                return;
            }

            if (status === 'loading') {
                setTasks([]);
                setIsLoadingTasks(true);
                setTasksLoadFailed(false);
                setError('');
                setSuccess('');
                return;
            }

            if (!isAuthenticated || !userId) {
                setTasks([]);
                setIsLoadingTasks(false);
                setTasksLoadFailed(false);

                if (status === 'error') {
                    setError(
                        'No se pudo comprobar tu sesión. Intenta volver a iniciar sesión.',
                    );
                } else {
                    setError('');
                }

                setSuccess('');
                return;
            }

            setTasks([]);
            setIsLoadingTasks(true);
            setTasksLoadFailed(false);
            setError('');
            setSuccess('');

            try {
                const loadedTasks = await getAllFirestoreTasks();

                if (!canApplyResult()) {
                    return;
                }

                setTasks(loadedTasks);
                setTasksLoadFailed(false);
                setError('');
            } catch (caughtError) {
                if (!canApplyResult()) {
                    return;
                }

                setTasks([]);
                setTasksLoadFailed(true);
                setError(
                    `${getErrorMessage(
                        caughtError,
                        'No se pudieron cargar las tareas.',
                    )} Puedes volver a intentarlo con el botón para recargar las tareas.`,
                );
            } finally {
                if (canApplyResult()) {
                    setIsLoadingTasks(false);
                }
            }
        }

        void initializeTasks();

        return () => {
            active = false;
        };
    }, [isAuthenticated, status, userId]);

    async function refreshTasks(
        expectedUserId = userId,
    ): Promise<boolean> {
        if (
            !expectedUserId ||
            sessionUserIdRef.current !== expectedUserId
        ) {
            return false;
        }

        const requestId = ++loadRequestRef.current;

        try {
            const refreshedTasks = await getAllFirestoreTasks();

            if (
                !mountedRef.current ||
                sessionUserIdRef.current !== expectedUserId ||
                loadRequestRef.current !== requestId
            ) {
                return false;
            }

            setTasks(refreshedTasks);
            setTasksLoadFailed(false);
            setIsLoadingTasks(false);
            setError('');

            return true;
        } catch (caughtError) {
            if (
                !mountedRef.current ||
                sessionUserIdRef.current !== expectedUserId ||
                loadRequestRef.current !== requestId
            ) {
                return false;
            }

            const loadError = getErrorMessage(
                caughtError,
                'No se pudieron actualizar las tareas.',
            );

            setTasks([]);
            setTasksLoadFailed(true);
            setIsLoadingTasks(false);
            setError(
                `${loadError} Puedes volver a intentarlo con el botón para recargar las tareas.`,
            );

            return false;
        }
    }

    async function handleRetryLoad() {
        if (!isAuthenticated || !userId || isSubmitting) {
            return;
        }

        setError('');
        setSuccess('');
        setIsLoadingTasks(true);
        setTasksLoadFailed(false);

        await refreshTasks(userId);
    }

    function resetForm() {
        setForm({ ...EMPTY_FORM });
        setEditingTaskId(null);
        setError('');
        setSuccess('');
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (
            !isAuthenticated ||
            !userId ||
            isSubmitting ||
            (
                editingTaskId !== null &&
                pendingStatusIdsRef.current.has(editingTaskId)
            )
        ) {
            return;
        }

        setError('');
        setSuccess('');

        const todayString = new Date().toISOString().slice(0, 10);

        if (form.startDate && form.startDate < todayString) {
            setError('La fecha de inicio debe ser hoy o una fecha futura.');
            return;
        }

        if (
            form.startDate &&
            form.dueDate &&
            form.dueDate < form.startDate
        ) {
            setError(
                'La fecha límite debe ser igual o posterior a la fecha de inicio.',
            );
            return;
        }

        setIsSubmitting(true);

        const operationUserId = userId;
        const taskId = editingTaskId;

        try {
            const input: CreateTaskInput = {
                title: form.title,
                description: form.description,
                startDate: form.startDate || null,
                dueDate: form.dueDate || null,
            };

            const savedTask =
                taskId !== null
                    ? await updateFirestoreTask(taskId, input)
                    : await createFirestoreTask(input);

            if (
                !mountedRef.current ||
                sessionUserIdRef.current !== operationUserId
            ) {
                return;
            }

            setTasks((currentTasks) => {
                if (taskId !== null) {
                    return currentTasks.map((task) =>
                        task.id === savedTask.id ? savedTask : task,
                    );
                }

                return [
                    savedTask,
                    ...currentTasks.filter(
                        (task) => task.id !== savedTask.id,
                    ),
                ];
            });

            setTasksLoadFailed(false);
            setForm({ ...EMPTY_FORM });
            setEditingTaskId(null);

            setSuccess(
                taskId !== null
                    ? 'La tarea se actualizó correctamente.'
                    : 'La tarea se creó correctamente.',
            );
        } catch (caughtError) {
            if (
                !mountedRef.current ||
                sessionUserIdRef.current !== operationUserId
            ) {
                return;
            }

            setError(
                getErrorMessage(
                    caughtError,
                    'No se pudo guardar la tarea.',
                ),
            );
        } finally {
            if (
                mountedRef.current &&
                sessionUserIdRef.current === operationUserId
            ) {
                setIsSubmitting(false);
            }
        }
    }

    function handleEdit(task: Task) {
        if (
            isSubmitting ||
            pendingStatusIdsRef.current.has(task.id)
        ) {
            return;
        }

        setEditingTaskId(task.id);
        setForm({
            title: task.title,
            description: task.description,
            startDate: task.startDate ?? '',
            dueDate: task.dueDate ?? '',
        });

        setError('');
        setSuccess('');

        document.getElementById('task-title')?.focus();
    }

    function handleRestoreEditingValues() {
        if (editingTaskId === null || isSubmitting) {
            return;
        }

        const originalTask = tasks.find(
            (task) => task.id === editingTaskId,
        );

        if (!originalTask) {
            setError('No se encontró la tarea que estás editando.');
            return;
        }

        setForm({
            title: originalTask.title,
            description: originalTask.description,
            startDate: originalTask.startDate ?? '',
            dueDate: originalTask.dueDate ?? '',
        });

        setError('');
        setSuccess('');
    }

    function handleStatusChange(
        id: string,
        taskStatus: TaskStatus,
    ) {
        if (!isAuthenticated || !userId || isSubmitting) {
            return;
        }

        const currentTask = tasks.find((task) => task.id === id);

        if (!currentTask || currentTask.status === taskStatus) {
            return;
        }

        const operationUserId = userId;

        setError('');
        setSuccess('');

        // Reflejar el cambio de inmediato en la interfaz.
        setTasks((currentTasks) =>
            currentTasks.map((task) =>
                task.id === id
                    ? { ...task, status: taskStatus }
                    : task,
            ),
        );

        // Si esta tarea ya está guardando un estado anterior,
        // conservar solo la última selección del usuario.
        const existingOperation = statusOperationsRef.current.get(id);

        if (existingOperation) {
            existingOperation.desiredStatus = taskStatus;
            return;
        }

        const operation: PendingStatusOperation = {
            desiredStatus: taskStatus,
            confirmedTask: currentTask,
        };

        statusOperationsRef.current.set(id, operation);
        pendingStatusIdsRef.current.add(id);

        setPendingStatusIds(new Set(pendingStatusIdsRef.current));

        const canApplyResult = () =>
            mountedRef.current &&
            sessionUserIdRef.current === operationUserId &&
            statusOperationsRef.current.get(id) === operation;

        async function persistStatusChanges() {
            try {
                while (canApplyResult()) {
                    const statusToSave = operation.desiredStatus;

                    // El último estado solicitado ya está confirmado.
                    if (statusToSave === operation.confirmedTask.status) {
                        break;
                    }

                    try {
                        const savedTask = await updateFirestoreTask(
                            id,
                            { status: statusToSave },
                        );

                        if (!canApplyResult()) {
                            return;
                        }

                        // Guardar la última versión confirmada.
                        operation.confirmedTask = savedTask;

                        // Si el usuario cambió de nuevo el selector
                        // durante la petición, conservar visualmente
                        // esa selección más reciente.
                        setTasks((currentTasks) =>
                            currentTasks.map((task) =>
                                task.id === id
                                    ? {
                                        ...savedTask,
                                        status: operation.desiredStatus,
                                    }
                                    : task,
                            ),
                        );

                        if (operation.desiredStatus === statusToSave) {
                            setSuccess(STATUS_MESSAGES[statusToSave]);
                        }
                    } catch (caughtError) {
                        if (!canApplyResult()) {
                            return;
                        }

                        // Si hubo otra selección mientras se guardaba,
                        // continuar con el estado más reciente.
                        if (operation.desiredStatus !== statusToSave) {
                            continue;
                        }

                        // Si falla la última selección, recuperar
                        // el último estado confirmado por Firestore.
                        setTasks((currentTasks) =>
                            currentTasks.map((task) =>
                                task.id === id
                                    ? operation.confirmedTask
                                    : task,
                            ),
                        );

                        setError(
                            getErrorMessage(
                                caughtError,
                                'No se pudo actualizar el estado de la tarea.',
                            ),
                        );

                        break;
                    }
                }
            } finally {
                if (statusOperationsRef.current.get(id) === operation) {
                    statusOperationsRef.current.delete(id);
                    pendingStatusIdsRef.current.delete(id);

                    if (
                        mountedRef.current &&
                        sessionUserIdRef.current === operationUserId
                    ) {
                        setPendingStatusIds(
                            new Set(pendingStatusIdsRef.current),
                        );
                    }
                }
            }
        }

        // Guardar en segundo plano, sin bloquear el selector.
        void persistStatusChanges();
    }

    async function handleDelete(task: Task) {
        if (
            !isAuthenticated ||
            !userId ||
            isSubmitting ||
            pendingStatusIdsRef.current.has(task.id)
        ) {
            return;
        }

        const confirmed = window.confirm(
            `¿Seguro que deseas eliminar la tarea "${task.title}"? Esta acción no se puede deshacer.`,
        );

        if (!confirmed) {
            return;
        }

        setError('');
        setSuccess('');
        setIsSubmitting(true);

        const operationUserId = userId;

        try {
            await deleteFirestoreTask(task.id);

            if (
                !mountedRef.current ||
                sessionUserIdRef.current !== operationUserId
            ) {
                return;
            }

            if (editingTaskId === task.id) {
                setForm({ ...EMPTY_FORM });
                setEditingTaskId(null);
            }

            setTasks((currentTasks) =>
                currentTasks.filter(
                    (currentTask) => currentTask.id !== task.id,
                ),
            );

            setSuccess(
                `La tarea "${task.title}" se eliminó correctamente.`,
            );
        } catch (caughtError) {
            if (
                !mountedRef.current ||
                sessionUserIdRef.current !== operationUserId
            ) {
                return;
            }

            setError(
                getErrorMessage(
                    caughtError,
                    'Ocurrió un error al intentar eliminar la tarea.',
                ),
            );
        } finally {
            if (
                mountedRef.current &&
                sessionUserIdRef.current === operationUserId
            ) {
                setIsSubmitting(false);
            }
        }
    }

    function handleResetFilters() {
        setError('');
        setSuccess('');
        setPriorityFilter('todas');
        navigate('/tareas');
    }

    return (
        <main className="page-shell tasks-page">
            <h1>{currentRoute?.label ?? 'Tareas'}</h1>

            <p>
                Organiza tus actividades y da seguimiento a tu progreso.
            </p>

            {success && (
                <p
                    className="task-success"
                    role="status"
                    aria-live="polite"
                >
                    {success}
                </p>
            )}

            {error && (
                <p className="task-error" role="alert">
                    {error}
                </p>
            )}

            <nav
                aria-label="Secciones de tareas"
                className="tasks-navigation"
            >
                {TASK_ROUTES.map((route) => (
                    <Link
                        key={route.path}
                        to={route.path}
                        aria-current={
                            location.pathname === route.path
                                ? 'page'
                                : undefined
                        }
                    >
                        {route.label}
                    </Link>
                ))}
            </nav>

            <section aria-labelledby="task-form-heading">
                <h2 id="task-form-heading">
                    {editingTaskId !== null
                        ? 'Editar tarea'
                        : 'Crear una tarea'}
                </h2>

                <form onSubmit={handleSubmit} className="task-form">
                    <div className="task-form-field">
                        <label htmlFor="task-title">Título *</label>

                        <input
                            id="task-title"
                            name="title"
                            type="text"
                            value={form.title}
                            onChange={(event) =>
                                setForm((currentForm) => ({
                                    ...currentForm,
                                    title: event.target.value,
                                }))
                            }
                            placeholder="Ej. Estudiar TypeScript"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="task-form-field">
                        <label htmlFor="task-description">
                            Descripción (opcional)
                        </label>

                        <textarea
                            id="task-description"
                            name="description"
                            value={form.description}
                            onChange={(event) =>
                                setForm((currentForm) => ({
                                    ...currentForm,
                                    description: event.target.value,
                                }))
                            }
                            placeholder="Añade detalles de la tarea"
                            rows={3}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="task-form-field">
                        <label htmlFor="task-start-date">
                            Fecha de inicio planificada (opcional)
                        </label>

                        <input
                            id="task-start-date"
                            name="startDate"
                            type="date"
                            value={form.startDate}
                            onChange={(event) =>
                                setForm((currentForm) => ({
                                    ...currentForm,
                                    startDate: event.target.value,
                                }))
                            }
                            aria-invalid={
                                startDateError ? true : undefined
                            }
                            aria-describedby={
                                startDateError
                                    ? 'task-start-date-help task-start-date-error'
                                    : 'task-start-date-help'
                            }
                            disabled={isSubmitting}
                        />

                        <p id="task-start-date-help">
                            Indica cuándo planeas comenzar. El estado de la tarea
                            se actualizará manualmente.
                        </p>

                        {startDateError && (
                            <p
                                className="task-field-error"
                                id="task-start-date-error"
                            >
                                {startDateError}
                            </p>
                        )}
                    </div>

                    <div className="task-form-field">
                        <label htmlFor="task-due-date">
                            Fecha límite (opcional)
                        </label>

                        <input
                            id="task-due-date"
                            name="dueDate"
                            type="date"
                            value={form.dueDate}
                            onChange={(event) =>
                                setForm((currentForm) => ({
                                    ...currentForm,
                                    dueDate: event.target.value,
                                }))
                            }
                            aria-invalid={
                                dueDateError ? true : undefined
                            }
                            aria-describedby={
                                dueDateError
                                    ? 'task-due-date-error'
                                    : undefined
                            }
                            disabled={isSubmitting}
                        />

                        {dueDateError && (
                            <p
                                className="task-field-error"
                                id="task-due-date-error"
                            >
                                {dueDateError}
                            </p>
                        )}
                    </div>

                    <div className="task-form-actions">
                        <button
                            type="submit"
                            disabled={
                                isSubmitting ||
                                (
                                    editingTaskId !== null &&
                                    pendingStatusIds.has(editingTaskId)
                                ) ||
                                isLoadingTasks ||
                                !isAuthenticated ||
                                tasksLoadFailed
                            }
                        >
                            {isSubmitting
                                ? 'Guardando...'
                                : editingTaskId !== null
                                    ? 'Guardar cambios'
                                    : 'Crear tarea'}
                        </button>

                        {editingTaskId !== null && (
                            <>
                                <button
                                    type="button"
                                    className="task-button-secondary"
                                    onClick={handleRestoreEditingValues}
                                    disabled={isSubmitting}
                                >
                                    Restablecer cambios
                                </button>

                                <button
                                    type="button"
                                    className="task-button-secondary"
                                    onClick={resetForm}
                                    disabled={isSubmitting}
                                >
                                    Cancelar edición
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </section>

            <section aria-labelledby="task-list-heading">
                <h2 id="task-list-heading">Mis tareas</h2>

                <div className="task-filters">
                    <div className="task-form-field">
                        <label htmlFor="filter-status">
                            Filtrar por estado
                        </label>

                        <select
                            id="filter-status"
                            value={statusFilter}
                            onChange={(event) => {
                                const selectedStatus =
                                    event.target.value as StatusFilter;

                                const routeByStatus: Record<
                                    StatusFilter,
                                    string
                                > = {
                                    todas: '/tareas',
                                    pendiente: '/tareas/pendientes',
                                    en_progreso: '/tareas/en-progreso',
                                    completada: '/tareas/completadas',
                                    vencidas: '/tareas/vencidas',
                                };

                                navigate(
                                    routeByStatus[selectedStatus],
                                );
                            }}
                        >
                            <option value="todas">
                                Todos los estados
                            </option>
                            <option value="pendiente">
                                Pendientes
                            </option>
                            <option value="en_progreso">
                                En progreso
                            </option>
                            <option value="completada">
                                Completadas
                            </option>
                            <option value="vencidas">
                                Vencidas
                            </option>
                        </select>
                    </div>

                    <div className="task-form-field">
                        <label htmlFor="filter-priority">
                            Filtrar por prioridad
                        </label>

                        <select
                            id="filter-priority"
                            value={priorityFilter}
                            onChange={(event) =>
                                setPriorityFilter(
                                    event.target.value as PriorityFilter,
                                )
                            }
                        >
                            <option value="todas">
                                Todas las prioridades
                            </option>
                            <option value="baja">Baja</option>
                            <option value="media">Media</option>
                            <option value="alta">Alta</option>
                        </select>
                    </div>
                </div>

                {hasActiveFilters && (
                    <button
                        type="button"
                        className="task-filters-reset"
                        onClick={handleResetFilters}
                    >
                        Restablecer filtros
                    </button>
                )}

                {isLoadingTasks ? (
                    <div
                        className="task-empty"
                        role="status"
                        aria-live="polite"
                    >
                        <p className="task-empty-title">
                            Cargando tareas...
                        </p>
                    </div>
                ) : tasksLoadFailed ? (
                    <div className="task-empty">
                        <p className="task-empty-title">
                            No se pudo cargar la lista de tareas
                        </p>

                        <p>
                            No podemos confirmar qué tareas están disponibles
                            en este momento. Intenta cargar la lista nuevamente.
                        </p>

                        <button
                            type="button"
                            onClick={handleRetryLoad}
                            disabled={
                                isSubmitting || !isAuthenticated
                            }
                        >
                            Reintentar carga
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="task-count" aria-live="polite">
                            {visibleTasks.length}{' '}
                            {visibleTasks.length === 1
                                ? 'tarea encontrada'
                                : 'tareas encontradas'}
                        </p>

                        {visibleTasks.length === 0 ? (
                            <div className="task-empty">
                                {tasks.length === 0 ? (
                                    <>
                                        <p className="task-empty-title">
                                            Todavía no tienes tareas
                                        </p>

                                        <p>
                                            Crea tu primera tarea usando el
                                            formulario para comenzar a organizar
                                            tus actividades.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="task-empty-title">
                                            No encontramos tareas
                                        </p>

                                        <p>
                                            Ninguna tarea coincide con los
                                            filtros seleccionados. Restablece
                                            los filtros para volver a ver todas
                                            tus tareas.
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="task-list">
                                {visibleTasks.map((task) => {
                                    const dueDateStatus =
                                        getDueDateStatus(task);

                                    const automaticPriority =
                                        getAutomaticPriority(task);

                                    return (
                                        <article
                                            className={`task-card task-card-${dueDateStatus}`}
                                            key={task.id}
                                            aria-label={`Tarea: ${task.title}`}
                                        >
                                            {dueDateStatus !== 'normal' && (
                                                <span
                                                    className={`task-card-status-icon task-card-status-icon-${dueDateStatus}`}
                                                    aria-hidden="true"
                                                >
                                                    {dueDateStatus ===
                                                        'vencida' && '!'}
                                                    {dueDateStatus ===
                                                        'por-vencer' && '◷'}
                                                    {dueDateStatus ===
                                                        'completada' && '✓'}
                                                </span>
                                            )}

                                            <div className="task-card-heading">
                                                <h3>{task.title}</h3>

                                                {automaticPriority !== null && (
                                                    <span
                                                        className={`task-priority task-priority-${automaticPriority}`}
                                                    >
                                                        Prioridad:{' '}
                                                        {
                                                            PRIORITY_LABELS[
                                                            automaticPriority
                                                            ]
                                                        }
                                                    </span>
                                                )}
                                            </div>

                                            {task.description && (
                                                <p>{task.description}</p>
                                            )}

                                            <div className="task-card-metadata">
                                                {task.startDate && (
                                                    <p className="task-card-start-date">
                                                        Inicio planificado:{' '}
                                                        {formatCalendarDate(
                                                            task.startDate,
                                                        )}
                                                    </p>
                                                )}

                                                <p
                                                    className={`task-card-status-message task-card-status-message-${dueDateStatus}`}
                                                >
                                                    {getTaskStatusMessage(
                                                        task,
                                                    )}
                                                </p>
                                            </div>

                                            <div className="task-card-actions">
                                                <button
                                                    type="button"
                                                    className="task-button-secondary"
                                                    onClick={() =>
                                                        handleEdit(task)
                                                    }
                                                    disabled={
                                                        isSubmitting ||
                                                        pendingStatusIds.has(
                                                            task.id,
                                                        )
                                                    }
                                                >
                                                    Editar
                                                </button>

                                                <div className="task-form-field task-status-control">
                                                    <label
                                                        htmlFor={`task-status-${task.id}`}
                                                    >
                                                        Estado de la tarea
                                                    </label>

                                                    <select
                                                        id={`task-status-${task.id}`}
                                                        value={task.status}
                                                        onChange={(event) => {
                                                            handleStatusChange(
                                                                task.id,
                                                                event.target
                                                                    .value as TaskStatus,
                                                            );
                                                        }}
                                                        disabled={isSubmitting}
                                                    >
                                                        <option value="pendiente">
                                                            Pendiente
                                                        </option>
                                                        <option value="en_progreso">
                                                            En progreso
                                                        </option>
                                                        <option value="completada">
                                                            Completada
                                                        </option>
                                                    </select>

                                                </div>

                                                <button
                                                    type="button"
                                                    className="task-button-danger"
                                                    aria-label={`Eliminar ${task.title}`}
                                                    onClick={() => {
                                                        void handleDelete(task);
                                                    }}
                                                    disabled={
                                                        isSubmitting ||
                                                        pendingStatusIds.has(
                                                            task.id,
                                                        )
                                                    }
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </section>

            <Link
                to="/panel"
                className="tasks-back-link"
            >
                Volver al panel
            </Link>
        </main>
    );
}
