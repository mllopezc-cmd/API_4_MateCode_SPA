import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllTasks } from '../services/taskService';
import type { Task } from '../types/task';
import { getDueDateStatus } from '../utils/taskScheduling';
import { formatCalendarDate } from '../utils/dateFormatting';

function getEffectiveStatusLabel(task: Task): string {
    const labels = {
        pendiente: 'Pendiente',
        en_progreso: 'En progreso',
        completada: 'Completada',
    } satisfies Record<Task['status'], string>;

    return labels[task.status];
}

export default function DashboardPage() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const logoutInProgressRef = useRef(false);

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState<string | null>(null);

    const [tasksState, setTasksState] = useState(() => {
        try {
            return {
                tasks: getAllTasks(),
                hasError: false,
            };
        } catch {
            return {
                tasks: [] as Task[],
                hasError: true,
            };
        }
    });

    const { tasks, hasError } = tasksState;

    const pendingCount = tasks.filter(
        (task) => task.status === 'pendiente',
    ).length;

    const inProgressCount = tasks.filter(
        (task) => task.status === 'en_progreso',
    ).length;

    const completedCount = tasks.filter(
        (task) => task.status === 'completada',
    ).length;

    const upcomingTasks = tasks
        .filter((task) => task.dueDate !== null)
        .sort((first, second) => {
            const firstDate = first.dueDate ?? '';
            const secondDate = second.dueDate ?? '';

            return firstDate.localeCompare(secondDate);
        })
        .slice(0, 5);

    async function handleLogout() {
        if (logoutInProgressRef.current) {
            return;
        }

        logoutInProgressRef.current = true;
        setIsLoggingOut(true);
        setLogoutError(null);

        try {
            await logout();
        } catch {
            logoutInProgressRef.current = false;

            setLogoutError(
                'No se pudo cerrar la sesión. Inténtalo de nuevo.',
            );
            setIsLoggingOut(false);
            return;
        }

        navigate('/iniciar-sesion', { replace: true });
    }

    function handleRetryLoad() {
        try {
            const refreshedTasks = getAllTasks();

            setTasksState({
                tasks: refreshedTasks,
                hasError: false,
            });
        } catch {
            setTasksState({
                tasks: [],
                hasError: true,
            });
        }
    }

    function renderTaskLink(task: Task) {
        const dueDateStatus = getDueDateStatus(task);

        const statusIcon = {
            vencida: '!',
            'por-vencer': '◷',
            completada: '✓',
            normal: '',
        }[dueDateStatus];

        return (
            <li
                key={task.id}
                className={`dashboard-upcoming-task dashboard-upcoming-task-${dueDateStatus}`}
            >
                {statusIcon && (
                    <span
                        className={`dashboard-task-status-icon dashboard-task-status-icon-${dueDateStatus}`}
                        aria-hidden="true"
                    >
                        {statusIcon}
                    </span>
                )}

                <Link to="/tareas">{task.title}</Link>

                <span
                    className={`dashboard-task-details dashboard-task-details-${dueDateStatus}`}
                >
                    {dueDateStatus === 'vencida' && 'Vencida · '}
                    {dueDateStatus === 'por-vencer' && 'Por vencer · '}
                    {dueDateStatus === 'completada' && 'Completada · '}
                    Fecha límite: {formatCalendarDate(task.dueDate!)}
                    {' · '}
                    {getEffectiveStatusLabel(task)}
                </span>
            </li>
        );
    }

    return (
        <main className="page-shell dashboard-page">
            <h1>Panel principal</h1>
            <p>Bienvenido a tu espacio de trabajo de MateCode.</p>

            {hasError ? (
                <section aria-labelledby="dashboard-load-error-heading">
                    <h2 id="dashboard-load-error-heading">
                        No se pudieron cargar las tareas
                    </h2>

                    <p className="task-error" role="alert">
                        No se pudieron cargar las tareas. Comprueba el
                        almacenamiento del navegador e inténtalo de nuevo.
                    </p>

                    <button type="button" onClick={handleRetryLoad}>
                        Reintentar carga
                    </button>
                </section>
            ) : (
                <>
                    <section aria-labelledby="dashboard-summary-heading">
                        <h2 id="dashboard-summary-heading">
                            Resumen de tareas
                        </h2>

                        <dl className="dashboard-stats">
                            <div className="dashboard-stat">
                                <dt>Total de tareas</dt>
                                <dd>{tasks.length}</dd>
                            </div>

                            <div className="dashboard-stat">
                                <dt>Pendientes</dt>
                                <dd>{pendingCount}</dd>
                            </div>

                            <div className="dashboard-stat">
                                <dt>En progreso</dt>
                                <dd>{inProgressCount}</dd>
                            </div>

                            <div className="dashboard-stat">
                                <dt>Completadas</dt>
                                <dd>{completedCount}</dd>
                            </div>
                        </dl>

                        <Link
                            to="/tareas"
                            className="dashboard-tasks-link"
                        >
                            Administrar todas las tareas
                        </Link>
                    </section>

                    <section aria-labelledby="dashboard-upcoming-heading">
                        <h2 id="dashboard-upcoming-heading">
                            Próximas tareas
                        </h2>

                        {tasks.length === 0 ? (
                            <div className="dashboard-empty">
                                <p>
                                    Aún no tienes tareas. Crea la primera para
                                    comenzar a organizar tus actividades.
                                </p>
                                <Link to="/tareas">
                                    Crear mi primera tarea
                                </Link>
                            </div>
                        ) : upcomingTasks.length === 0 ? (
                            <p className="dashboard-empty">
                                No tienes tareas pendientes con fecha límite.
                            </p>
                        ) : (
                            <ul className="dashboard-upcoming-list">
                                {upcomingTasks.map(renderTaskLink)}
                            </ul>
                        )}

                        <nav
                            className="dashboard-quick-nav"
                            aria-label="Navegación del panel"
                        >
                            <h3>Accesos rápidos</h3>
                            <ul>
                                <li>
                                    <Link to="/tareas">
                                        Todas las tareas
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/tareas/pendientes">
                                        Tareas pendientes
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/tareas/en-progreso">
                                        Tareas en progreso
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/tareas/completadas">
                                        Tareas completadas
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/perfil">Mi perfil</Link>
                                </li>
                                <li>
                                    <Link to="/configuracion">
                                        Configuración
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/ayuda">Ayuda</Link>
                                </li>
                            </ul>
                        </nav>
                    </section>
                </>
            )}

            {logoutError && (
                <p className="task-error" role="alert">
                    {logoutError}
                </p>
            )}

            <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
            >
                {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
        </main>
    );
}