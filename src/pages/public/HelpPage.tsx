import { Link } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

import './InformationPages.css';

/**
 * MateCode Premium Cyber-Executive
 * Etapa 8 - Bloque 4A
 *
 * Centro de ayuda adaptable a la sesión.
 *
 * La ruta /ayuda es pública, pero se integra
 * en PrivateLayout cuando el usuario
 * está autenticado.
 */
export default function HelpPage() {
    const { status } = useAuth();

    const isAuthenticated =
        status === 'authenticated';

    return (
        <main className="page-shell info-page info-page--help">
            <header className="info-page__hero">
                <span className="info-page__eyebrow">
                    CENTRO DE AYUDA
                </span>

                <h1>Ayuda de MateCode</h1>

                <p>
                    {isAuthenticated
                        ? 'Encuentra orientación para administrar tus tareas y utilizar tu espacio de trabajo.'
                        : 'Encuentra orientación para comenzar a utilizar la plataforma.'}
                </p>

                {isAuthenticated && (
                    <div className="info-page__hero-actions">
                        <Link
                            to="/tareas"
                            className="info-page__button info-page__button--primary"
                        >
                            Ir a mis tareas
                        </Link>

                        <Link
                            to="/perfil"
                            className="info-page__button info-page__button--outline"
                        >
                            Mi cuenta
                        </Link>
                    </div>
                )}
            </header>

            <div className="info-page__grid">
                <section
                    className="info-page__card"
                    aria-labelledby="navigation-help"
                >
                    <div className="info-page__card-heading">
                        <span
                            className="info-page__step"
                            aria-hidden="true"
                        >
                            01
                        </span>

                        <h2 id="navigation-help">
                            Navegación
                        </h2>
                    </div>

                    {isAuthenticated ? (
                        <>
                            <p>
                                Utiliza el menú lateral en escritorio
                                para acceder al panel, gestionar tareas
                                y consultar tu cuenta.
                            </p>

                            <p>
                                En el teléfono encontrarás la navegación
                                principal en la parte inferior. El menú
                                hamburguesa permite abrir Configuración,
                                Ayuda, Contacto y Cerrar sesión.
                            </p>
                        </>
                    ) : (
                        <p>
                            Desde el inicio puedes consultar información
                            sobre MateCode, acceder a tu cuenta y visitar
                            esta sección de ayuda.
                        </p>
                    )}
                </section>

                <section
                    className="info-page__card"
                    aria-labelledby="account-help"
                >
                    <div className="info-page__card-heading">
                        <span
                            className="info-page__step"
                            aria-hidden="true"
                        >
                            02
                        </span>

                        <h2 id="account-help">
                            Cuenta y acceso
                        </h2>
                    </div>

                    {isAuthenticated ? (
                        <>
                            <p>
                                La sección Mi cuenta permite consultar
                                la información asociada a tu sesión.
                            </p>

                            <p>
                                Si necesitas salir de MateCode, utiliza
                                Cerrar sesión desde la barra lateral
                                o el menú hamburguesa móvil.
                            </p>

                            <Link
                                to="/perfil"
                                className="info-page__inline-link"
                            >
                                Ir a Mi cuenta
                            </Link>
                        </>
                    ) : (
                        <>
                            <p>
                                Las funciones personales requieren iniciar
                                sesión. Si todavía no tienes cuenta,
                                puedes consultar la página de registro.
                            </p>

                            <div className="info-page__inline-actions">
                                <Link
                                    to="/iniciar-sesion"
                                    className="info-page__inline-link"
                                >
                                    Iniciar sesión
                                </Link>

                                <Link
                                    to="/crear-cuenta"
                                    className="info-page__inline-link"
                                >
                                    Crear cuenta
                                </Link>
                            </div>
                        </>
                    )}
                </section>

                <section
                    className="info-page__card"
                    aria-labelledby="tasks-help"
                >
                    <div className="info-page__card-heading">
                        <span
                            className="info-page__step"
                            aria-hidden="true"
                        >
                            03
                        </span>

                        <h2 id="tasks-help">
                            Gestión de tareas
                        </h2>
                    </div>

                    <p>
                        Desde Mis tareas puedes registrar actividades,
                        añadir una descripción y establecer fechas
                        de inicio o de vencimiento.
                    </p>

                    <p>
                        También puedes editar una tarea, cambiar
                        su estado o eliminarla cuando ya no sea
                        necesaria.
                    </p>

                    {isAuthenticated && (
                        <Link
                            to="/tareas"
                            className="info-page__inline-link"
                        >
                            Abrir gestión de tareas
                        </Link>
                    )}
                </section>

                <section
                    className="info-page__card"
                    aria-labelledby="status-help"
                >
                    <div className="info-page__card-heading">
                        <span
                            className="info-page__step"
                            aria-hidden="true"
                        >
                            04
                        </span>

                        <h2 id="status-help">
                            Estados y fechas
                        </h2>
                    </div>

                    <p>
                        Las tareas pueden estar pendientes,
                        en progreso o completadas. Puedes
                        actualizar manualmente su estado.
                    </p>

                    <p>
                        Los avisos de próximo vencimiento y
                        vencimiento dependen de la fecha límite.
                        Una tarea puede estar en progreso y,
                        al mismo tiempo, próxima a vencer.
                    </p>
                </section>
            </div>

            <section
                className="info-page__support"
                aria-labelledby="help-support-heading"
            >
                <div>
                    <span className="info-page__eyebrow">
                        MÁS INFORMACIÓN
                    </span>

                    <h2 id="help-support-heading">
                        ¿Necesitas más orientación?
                    </h2>

                    <p>
                        Consulta la sección Contacto para conocer
                        el estado de los canales de atención de MateCode.
                    </p>
                </div>

                <Link
                    to="/contacto"
                    className="info-page__button info-page__button--outline"
                >
                    Ir a Contacto
                </Link>
            </section>

            <nav
                className="info-page__footer-nav"
                aria-label="Regresar desde Ayuda"
            >
                <Link
                    to={isAuthenticated ? '/panel' : '/'}
                    className="info-page__back-link"
                >
                    {isAuthenticated
                        ? 'Volver al panel'
                        : 'Volver al inicio'}
                </Link>
            </nav>
        </main>
    );
}
