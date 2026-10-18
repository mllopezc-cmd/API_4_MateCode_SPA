import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type {
    Task,
    TaskPriority,
    TaskStatus,
} from '../types/task';
import {
    getAutomaticPriority,
    getDueDateStatus,
} from '../utils/taskScheduling';
import {
    addTask,
    changeTaskStatus,
    deleteTask,
    getAllTasks,
    updateTask,
} from '../services/taskService';
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

function getErrorMessage(
    error: unknown,
    fallback: string,
): string {
    return error instanceof Error ? error.message : fallback;
}

interface InitialTasksState {
    tasks: Task[];
    error: string;
}

function getInitialTasksState(): InitialTasksState {
    try {
        return {
            tasks: getAllTasks(),
            error: '',
        };
    } catch (caughtError) {
        return {
            tasks: [],
            error: getErrorMessage(
                caughtError,
                'No se pudieron cargar las tareas.',
            ),
        };
    }
}

export default function TasksPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const [initialTasksState] = useState<InitialTasksState>(
        getInitialTasksState,
    );

    const [tasks, setTasks] = useState<Task[]>(initialTasksState.tasks);
    const [tasksLoadFailed, setTasksLoadFailed] = useState(
        Boolean(initialTasksState.error),
    );

    const [form, setForm] = useState<TaskForm>({ ...EMPTY_FORM });
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const statusFilter = getRouteStatus(location.pathname);

    const [priorityFilter, setPriorityFilter] =
        useState<PriorityFilter>('todas');

    const [error, setError] = useState(initialTasksState.error);
    const [success, setSuccess] = useState('');

    const startDateError =
        error.includes('La fecha de inicio debe ser hoy o una fecha futura.')
            ? error
            : '';

    const dueDateError =
        error.includes(
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

    /**
     * Recarga las tareas.
     *
     * Si la lectura falla, se oculta la lista anterior para evitar
     * presentar datos potencialmente desactualizados como actuales.
     * operationSuccessMessage permite comunicar que la escritura
     * terminó correctamente aunque haya fallado la recarga posterior.
     */
    function refreshTasks(operationSuccessMessage?: string): boolean {
        try {
            const refreshedTasks = getAllTasks();

            setTasks(refreshedTasks);
            setTasksLoadFailed(false);
            setError('');

            return true;
        } catch (caughtError) {
            const loadError = getErrorMessage(
                caughtError,
                'No se pudieron actualizar las tareas.',
            );

            setTasksLoadFailed(true);

            setError(
                operationSuccessMessage
                    ? `${operationSuccessMessage} Sin embargo, no se pudo actualizar la lista de tareas. La lista anterior se ha ocultado para evitar mostrar información desactualizada. ${loadError}`
                    : `${loadError} Puedes volver a intentarlo con el botón para recargar las tareas.`,
            );

            return false;
        }
    }

    function handleRetryLoad() {
        setError('');
        setSuccess('');

        refreshTasks();
    }

    function resetForm() {
        setForm({ ...EMPTY_FORM });
        setEditingTaskId(null);
        setError('');
        setSuccess('');
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setSuccess('');

        const taskId = editingTaskId;

        try {
            const input = {
                title: form.title,
                description: form.description,
                startDate: form.startDate || null,
                dueDate: form.dueDate || null,
            };

            if (taskId !== null) {
                const updatedTask = updateTask(taskId, input);

                if (!updatedTask) {
                    setError('No se encontró la tarea que deseas editar.');
                    return;
                }
            } else {
                addTask(input);
            }

            setForm({ ...EMPTY_FORM });
            setEditingTaskId(null);

            const operationSuccessMessage =
                taskId !== null
                    ? 'La tarea se actualizó correctamente.'
                    : 'La tarea se creó correctamente.';

            if (refreshTasks(operationSuccessMessage)) {
                setSuccess(operationSuccessMessage);
            }
        } catch (caughtError) {
            setError(
                getErrorMessage(
                    caughtError,
                    'No se pudo guardar la tarea.',
                ),
            );
        }
    }

    function handleEdit(task: Task) {
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
        if (editingTaskId === null) {
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

    function handleStatusChange(id: string, status: TaskStatus) {
        setError('');
        setSuccess('');

        try {
            const updatedTask = changeTaskStatus(id, status);

            if (!updatedTask) {
                setError(
                    'No se encontró la tarea cuyo estado deseas actualizar.',
                );
                return;
            }

            const operationSuccessMessage = STATUS_MESSAGES[status];

            if (refreshTasks(operationSuccessMessage)) {
                setSuccess(operationSuccessMessage);
            }
        } catch (caughtError) {
            setError(
                getErrorMessage(
                    caughtError,
                    'No se pudo actualizar el estado de la tarea.',
                ),
            );
        }
    }

    function handleDelete(task: Task) {
        const confirmed = window.confirm(
            `¿Seguro que deseas eliminar la tarea "${task.title}"? Esta acción no se puede deshacer.`,
        );

        if (!confirmed) {
            return;
        }

        setError('');
        setSuccess('');

        try {
            const deleted = deleteTask(task.id);

            if (!deleted) {
                setError(
                    'No se pudo eliminar la tarea porque ya no existe.',
                );
                return;
            }

            if (editingTaskId === task.id) {
                setForm({ ...EMPTY_FORM });
                setEditingTaskId(null);
            }

            const operationSuccessMessage =
                `La tarea "${task.title}" se eliminó correctamente.`;

            if (refreshTasks(operationSuccessMessage)) {
                setSuccess(operationSuccessMessage);
            }
        } catch (caughtError) {
            setError(
                getErrorMessage(
                    caughtError,
                    'Ocurrió un error al intentar eliminar la tarea.',
                ),
            );
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
                <p className="task-success" role="status" aria-live="polite">
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
                    {editingTaskId !== null ? 'Editar tarea' : 'Crear una tarea'}
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
                            aria-invalid={startDateError ? true : undefined}
                            aria-describedby={
                                startDateError
                                    ? 'task-start-date-help task-start-date-error'
                                    : 'task-start-date-help'
                            }
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
                            aria-invalid={dueDateError ? true : undefined}
                            aria-describedby={
                                dueDateError ? 'task-due-date-error' : undefined
                            }
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
                        <button type="submit">
                            {editingTaskId !== null
                                ? 'Guardar cambios'
                                : 'Crear tarea'}
                        </button>

                        {editingTaskId !== null && (
                            <>
                                <button
                                    type="button"
                                    className="task-button-secondary"
                                    onClick={handleRestoreEditingValues}
                                >
                                    Restablecer cambios
                                </button>

                                <button
                                    type="button"
                                    className="task-button-secondary"
                                    onClick={resetForm}
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

                                const routeByStatus: Record<StatusFilter, string> = {
                                    todas: '/tareas',
                                    pendiente: '/tareas/pendientes',
                                    en_progreso: '/tareas/en-progreso',
                                    completada: '/tareas/completadas',
                                    vencidas: '/tareas/vencidas',
                                };

                                navigate(routeByStatus[selectedStatus]);
                            }}
                        >
                            <option value="todas">Todos los estados</option>
                            <option value="pendiente">Pendientes</option>
                            <option value="en_progreso">En progreso</option>
                            <option value="completada">Completadas</option>
                            <option value="vencidas">Vencidas</option>
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

                {tasksLoadFailed ? (
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
                                            Crea tu primera tarea usando el formulario
                                            para comenzar a organizar tus actividades.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="task-empty-title">
                                            No encontramos tareas
                                        </p>

                                        <p>
                                            Ninguna tarea coincide con los filtros
                                            seleccionados. Restablece los filtros para
                                            volver a ver todas tus tareas.
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="task-list">
                                {visibleTasks.map((task) => {
                                    const dueDateStatus = getDueDateStatus(task);
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
                                                    {dueDateStatus === 'vencida' && '!'}
                                                    {dueDateStatus === 'por-vencer' && '◷'}
                                                    {dueDateStatus === 'completada' && '✓'}
                                                </span>
                                            )}

                                            <div className="task-card-heading">
                                                <h3>{task.title}</h3>

                                                {automaticPriority !== null && (
                                                    <span
                                                        className={`task-priority task-priority-${automaticPriority}`}
                                                    >
                                                        Prioridad:{' '}
                                                        {PRIORITY_LABELS[automaticPriority]}
                                                    </span>
                                                )}
                                            </div>

                                            {task.description && (
                                                <p>{task.description}</p>
                                            )}

                                            <div className="task-card-metadata">
                                                {task.startDate && (
                                                    <p className="task-card-start-date">
                                                        Inicio planificado: {formatCalendarDate(task.startDate)}
                                                    </p>
                                                )}

                                                <p
                                                    className={`task-card-status-message task-card-status-message-${dueDateStatus}`}
                                                >
                                                    {getTaskStatusMessage(task)}
                                                </p>
                                            </div>

                                            <div className="task-card-actions">
                                                <button
                                                    type="button"
                                                    className="task-button-secondary"
                                                    onClick={() => handleEdit(task)}
                                                >
                                                    Editar
                                                </button>

                                                <div className="task-form-field task-status-control">
                                                    <label htmlFor={`task-status-${task.id}`}>
                                                        Estado de la tarea
                                                    </label>

                                                    <select
                                                        id={`task-status-${task.id}`}
                                                        value={task.status}
                                                        onChange={(event) =>
                                                            handleStatusChange(
                                                                task.id,
                                                                event.target.value as TaskStatus,
                                                            )
                                                        }
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
                                                    onClick={() => handleDelete(task)}
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

            <Link to="/panel" className="tasks-back-link">
                Volver al panel
            </Link>
        </main>
    );
}
