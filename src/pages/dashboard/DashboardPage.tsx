import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { Link } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { getAllFirestoreTasks } from '../../services/firestoreTaskService';

import type { Task } from '../../types/task';

import { getDueDateStatus } from '../../utils/taskScheduling';
import { formatCalendarDate } from '../../utils/dateFormatting';

import './DashboardPremium.css';

type DashboardIconName =
    | 'total'
    | 'pending'
    | 'progress'
    | 'completed'
    | 'arrow'
    | 'plus';

function DashboardIcon({
    name,
}: {
    name: DashboardIconName;
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {name === 'total' && (
                <>
                    <rect x="3" y="3" width="7" height="7" rx="2" />
                    <rect x="14" y="3" width="7" height="7" rx="2" />
                    <rect x="3" y="14" width="7" height="7" rx="2" />
                    <rect x="14" y="14" width="7" height="7" rx="2" />
                </>
            )}

            {name === 'pending' && (
                <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                </>
            )}

            {name === 'progress' && (
                <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 3a9 9 0 0 1 9 9" />
                    <path d="m8 12 3 3 5-6" />
                </>
            )}

            {name === 'completed' && (
                <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="m7.5 12 3 3 6-6" />
                </>
            )}

            {name === 'arrow' && (
                <>
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                </>
            )}

            {name === 'plus' && (
                <>
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                </>
            )}
        </svg>
    );
}

function getEffectiveStatusLabel(task: Task): string {
    const labels = {
        pendiente: 'Pendiente',
        en_progreso: 'En progreso',
        completada: 'Completada',
    } satisfies Record<Task['status'], string>;

    return labels[task.status];
}

/**
 * MateCode Premium Cyber-Executive
 * Etapa 8 - Bloques 3 y 4A
 *
 * Dashboard conectado a Firestore.
 *
 * El cierre de sesión pertenece ahora
 * a PrivateLayout y funciona en todas
 * las rutas privadas.
 */
export default function DashboardPage() {
    const { status, user } = useAuth();

    const loadRequestRef = useRef(0);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    const userId = user?.uid;

    const isAuthenticated =
        status === 'authenticated' &&
        Boolean(userId) &&
        user?.emailVerified === true;

    /*
     * Se mantiene la prevención de respuestas
     * obsoletas durante la carga de tareas.
     */
    const loadTasks = useCallback(
        async (isRetry = false) => {
            const requestId = ++loadRequestRef.current;

            if (!isAuthenticated) {
                setTasks([]);
                setHasError(false);
                setIsLoading(status === 'loading');
                setIsRetrying(false);
                return;
            }

            setHasError(false);
            setIsLoading(true);

            if (isRetry) {
                setIsRetrying(true);
            }

            try {
                const result = await getAllFirestoreTasks();

                if (requestId !== loadRequestRef.current) {
                    return;
                }

                setTasks(result);
                setHasError(false);
            } catch (caughtError) {
                if (requestId !== loadRequestRef.current) {
                    return;
                }

                console.error(
                    '[MateCode Dashboard] Error al cargar tareas:',
                    caughtError,
                );

                setTasks([]);
                setHasError(true);
            } finally {
                if (requestId === loadRequestRef.current) {
                    setIsLoading(false);
                    setIsRetrying(false);
                }
            }
        },
        [isAuthenticated, status],
    );

    useEffect(() => {
        let active = true;

        void Promise.resolve().then(() => {
            if (active) {
                void loadTasks();
            }
        });

        return () => {
            active = false;
            loadRequestRef.current += 1;
        };
    }, [loadTasks, userId, user?.emailVerified]);

    /*
     * Indicadores reales calculados
     * a partir de las tareas del usuario.
     */
    const pendingCount = tasks.filter(
        (task) => task.status === 'pendiente',
    ).length;

    const inProgressCount = tasks.filter(
        (task) => task.status === 'en_progreso',
    ).length;

    const completedCount = tasks.filter(
        (task) => task.status === 'completada',
    ).length;

    const overdueCount = tasks.filter(
        (task) => getDueDateStatus(task) === 'vencida',
    ).length;

    /*
     * Ordenamiento conservado:
     * primero tareas con fecha límite
     * y después tareas sin fecha.
     */
    const upcomingTasks = [...tasks]
        .sort((first, second) => {
            if (
                first.dueDate !== null &&
                second.dueDate !== null
            ) {
                return first.dueDate.localeCompare(
                    second.dueDate,
                );
            }

            if (first.dueDate !== null) {
                return -1;
            }

            if (second.dueDate !== null) {
                return 1;
            }

            return second.createdAt.localeCompare(
                first.createdAt,
            );
        })
        .slice(0, 5);

    /*
     * Distribución actual.
     * No representa productividad histórica.
     */
    const totalCount = tasks.length;

    const pendingPercentage = totalCount
        ? (pendingCount / totalCount) * 100
        : 0;

    const progressPercentage = totalCount
        ? (inProgressCount / totalCount) * 100
        : 0;

    const progressLimit =
        pendingPercentage + progressPercentage;

    const distributionBackground = totalCount
        ? `conic-gradient(
        var(--dashboard-pending) 0% ${pendingPercentage}%,
        var(--dashboard-progress)
          ${pendingPercentage}% ${progressLimit}%,
        var(--dashboard-complete)
          ${progressLimit}% 100%
      )`
        : undefined;

    const displayName =
        user?.displayName?.trim() ||
        user?.email?.split('@')[0]?.trim() ||
        '';

    const firstName = displayName
        ? displayName.split(/\s+/)[0]
        : '';

    function handleRetryLoad() {
        if (isRetrying || isLoading) {
            return;
        }

        void loadTasks(true);
    }

    /*
     * Tarjeta de próxima tarea.
     *
     * Se mantienen las clases anteriores
     * y los estilos del bloque 3.
     */
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
                className={[
                    'dashboard-upcoming-task',
                    `dashboard-upcoming-task-${dueDateStatus}`,
                    `dashboard-upcoming-task--${task.status}`,
                ].join(' ')}
            >
                {statusIcon && (
                    <span
                        className={[
                            'dashboard-task-status-icon',
                            `dashboard-task-status-icon-${dueDateStatus}`,
                        ].join(' ')}
                        aria-hidden="true"
                    >
                        {statusIcon}
                    </span>
                )}

                <Link
                    to="/tareas"
                    className="dashboard-task-title"
                >
                    {task.title}
                </Link>

                <span
                    className={[
                        'dashboard-task-details',
                        `dashboard-task-details-${dueDateStatus}`,
                    ].join(' ')}
                >
                    {dueDateStatus === 'vencida' && 'Vencida · '}
                    {dueDateStatus === 'por-vencer' && 'Por vencer · '}

                    {task.dueDate !== null
                        ? `Fecha límite: ${formatCalendarDate(
                            task.dueDate,
                        )}`
                        : 'Sin fecha programada'}

                    {' · '}
                    {getEffectiveStatusLabel(task)}
                </span>
            </li>
        );
    }

    const metrics = [
        {
            id: 'total',
            label: 'Total de tareas',
            value: totalCount,
            icon: 'total',
        },
        {
            id: 'pending',
            label: 'Pendientes',
            value: pendingCount,
            icon: 'pending',
        },
        {
            id: 'progress',
            label: 'En progreso',
            value: inProgressCount,
            icon: 'progress',
        },
        {
            id: 'completed',
            label: 'Completadas',
            value: completedCount,
            icon: 'completed',
        },
    ] as const;

    return (
        <main className="page-shell dashboard-page dashboard-page--premium">
            {/* Cabecera principal */}
            <header className="dashboard-hero">
                <div className="dashboard-hero__content">
                    <span className="dashboard-hero__eyebrow">
                        {firstName
                            ? `MI ESPACIO DE TRABAJO · ${firstName}`
                            : 'MI ESPACIO DE TRABAJO'}
                    </span>

                    <h1>Panel principal</h1>

                    <p>
                        Bienvenido a tu espacio de trabajo de MateCode.
                    </p>

                    <div className="dashboard-hero__actions">
                        <Link
                            to="/tareas"
                            className="dashboard-action dashboard-action--primary"
                        >
                            <DashboardIcon name="plus" />
                            <span>Nueva tarea</span>
                        </Link>

                        <Link
                            to="/tareas"
                            className="dashboard-action dashboard-action--secondary"
                        >
                            <span>Ver mis tareas</span>
                            <DashboardIcon name="arrow" />
                        </Link>
                    </div>
                </div>

                <div
                    className="dashboard-hero__visual"
                    aria-hidden="true"
                >
                    <div className="dashboard-hero__orbit">
                        <div className="dashboard-hero__orbit-inner">
                            <span>MC</span>
                        </div>
                    </div>

                    <div className="dashboard-hero__light" />
                </div>
            </header>

            {/* Estados de acceso y carga */}
            {status === 'loading' ? (
                <section
                    className="dashboard-feedback"
                    aria-live="polite"
                    aria-busy="true"
                >
                    <p>Cargando tu sesión…</p>
                </section>
            ) : !isAuthenticated ? (
                <section
                    className="dashboard-feedback"
                    aria-labelledby="dashboard-auth-heading"
                >
                    <h2 id="dashboard-auth-heading">
                        Verifica tu acceso
                    </h2>

                    <p>
                        Para consultar tus tareas, inicia sesión con
                        una cuenta cuyo correo electrónico esté
                        verificado.
                    </p>

                    <Link to="/iniciar-sesion">
                        Iniciar sesión
                    </Link>
                </section>
            ) : isLoading ? (
                <section
                    className="dashboard-feedback"
                    aria-live="polite"
                    aria-busy="true"
                >
                    <h2>Cargando tus tareas</h2>

                    <p>
                        Estamos consultando tus tareas en la nube…
                    </p>
                </section>
            ) : hasError ? (
                <section
                    className="dashboard-feedback"
                    aria-labelledby="dashboard-load-error-heading"
                >
                    <h2 id="dashboard-load-error-heading">
                        No se pudieron cargar las tareas
                    </h2>

                    <p className="task-error" role="alert">
                        No se pudieron cargar tus tareas desde
                        Firestore. Comprueba tu conexión e inténtalo
                        de nuevo.
                    </p>

                    <button
                        type="button"
                        onClick={handleRetryLoad}
                        disabled={isRetrying}
                    >
                        {isRetrying
                            ? 'Reintentando…'
                            : 'Reintentar carga'}
                    </button>
                </section>
            ) : (
                <>
                    {/* Indicadores */}
                    <section
                        className="dashboard-summary"
                        aria-labelledby="dashboard-summary-heading"
                    >
                        <div className="dashboard-section-heading">
                            <div>
                                <span className="dashboard-section-kicker">
                                    ESTADO ACTUAL
                                </span>

                                <h2 id="dashboard-summary-heading">
                                    Resumen de tareas
                                </h2>
                            </div>

                            <Link
                                to="/tareas"
                                className="dashboard-tasks-link"
                            >
                                Administrar todas las tareas
                                <DashboardIcon name="arrow" />
                            </Link>
                        </div>

                        <dl className="dashboard-stats">
                            {metrics.map((metric) => (
                                <div
                                    key={metric.id}
                                    className={[
                                        'dashboard-stat',
                                        `dashboard-stat--${metric.id}`,
                                    ].join(' ')}
                                >
                                    <div className="dashboard-stat__top">
                                        <span
                                            className="dashboard-stat__icon"
                                            aria-hidden="true"
                                        >
                                            <DashboardIcon name={metric.icon} />
                                        </span>
                                    </div>

                                    <dt>{metric.label}</dt>
                                    <dd>{metric.value}</dd>
                                </div>
                            ))}
                        </dl>

                        <p
                            className={[
                                'dashboard-overdue-note',
                                overdueCount > 0
                                    ? 'dashboard-overdue-note--alert'
                                    : '',
                            ].join(' ')}
                        >
                            {overdueCount > 0
                                ? `${overdueCount} ${overdueCount === 1
                                    ? 'tarea vencida requiere'
                                    : 'tareas vencidas requieren'
                                } atención.`
                                : 'Sin tareas vencidas.'}
                        </p>
                    </section>

                    {/* Contenido principal */}
                    <div className="dashboard-main-grid">
                        <section
                            className="dashboard-activities"
                            aria-labelledby="dashboard-upcoming-heading"
                        >
                            <div className="dashboard-section-heading">
                                <div>
                                    <span className="dashboard-section-kicker">
                                        AGENDA
                                    </span>

                                    <h2 id="dashboard-upcoming-heading">
                                        Próximas tareas
                                    </h2>
                                </div>

                                <Link
                                    to="/tareas"
                                    className="dashboard-view-all"
                                >
                                    Ver todas
                                    <DashboardIcon name="arrow" />
                                </Link>
                            </div>

                            {tasks.length === 0 ? (
                                <div className="dashboard-empty">
                                    <p>
                                        Aún no tienes tareas. Crea la primera
                                        para comenzar a organizar tus
                                        actividades.
                                    </p>

                                    <Link to="/tareas">
                                        Crear mi primera tarea
                                    </Link>
                                </div>
                            ) : (
                                <ul className="dashboard-upcoming-list">
                                    {upcomingTasks.map(renderTaskLink)}
                                </ul>
                            )}
                        </section>

                        <div className="dashboard-side-stack">
                            {/* Distribución actual */}
                            <section
                                className="dashboard-distribution"
                                aria-labelledby="dashboard-distribution-heading"
                            >
                                <span className="dashboard-section-kicker">
                                    VISTA GENERAL
                                </span>

                                <h2 id="dashboard-distribution-heading">
                                    Distribución actual
                                </h2>

                                <div className="dashboard-distribution__chart">
                                    <div
                                        className="dashboard-donut"
                                        style={{
                                            background: distributionBackground,
                                        }}
                                        role="img"
                                        aria-label={
                                            `Distribución de ${totalCount} tareas: ` +
                                            `${pendingCount} pendientes, ` +
                                            `${inProgressCount} en progreso y ` +
                                            `${completedCount} completadas`
                                        }
                                    >
                                        <div className="dashboard-donut__center">
                                            <strong>{totalCount}</strong>

                                            <span>
                                                {totalCount === 1
                                                    ? 'tarea'
                                                    : 'tareas'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <ul className="dashboard-distribution__legend">
                                    <li className="dashboard-legend--pending">
                                        {`Pendientes · ${pendingCount}`}
                                    </li>

                                    <li className="dashboard-legend--progress">
                                        {`En progreso · ${inProgressCount}`}
                                    </li>

                                    <li className="dashboard-legend--completed">
                                        {`Completadas · ${completedCount}`}
                                    </li>
                                </ul>

                                <p className="dashboard-distribution__note">
                                    Distribución por estado de las tareas
                                    registradas actualmente.
                                </p>
                            </section>

                            {/* Accesos rápidos conservados */}
                            <section className="dashboard-shortcuts">
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
                                            <Link to="/perfil">
                                                Mi perfil
                                            </Link>
                                        </li>

                                        <li>
                                            <Link to="/configuracion">
                                                Configuración
                                            </Link>
                                        </li>

                                        <li>
                                            <Link to="/ayuda">
                                                Ayuda
                                            </Link>
                                        </li>
                                    </ul>
                                </nav>
                            </section>
                        </div>
                    </div>
                </>
            )}
        </main>
    );
}
