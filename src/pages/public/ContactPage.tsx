import { Link } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

import './InformationPages.css';

/**
 * MateCode Premium Cyber-Executive
 * Etapa 8 - Bloque 4A
 *
 * Contacto público y privado.
 *
 * No se inventan direcciones, teléfonos
 * ni servicios de envío de mensajes.
 */
export default function ContactPage() {
    const { status } = useAuth();

    const isAuthenticated =
        status === 'authenticated';

    return (
        <main className="page-shell info-page info-page--contact">
            <header className="info-page__hero">
                <span className="info-page__eyebrow">
                    COMUNICACIÓN Y SOPORTE
                </span>

                <h1>Contacto</h1>

                <p>
                    Información sobre los canales de comunicación
                    y los recursos de ayuda de MateCode.
                </p>
            </header>

            <div className="info-page__grid">
                <section
                    className="info-page__card info-page__card--wide"
                    aria-labelledby="contact-channels-heading"
                >
                    <div className="info-page__card-heading">
                        <span
                            className="info-page__step"
                            aria-hidden="true"
                        >
                            01
                        </span>

                        <h2 id="contact-channels-heading">
                            Canales de contacto
                        </h2>
                    </div>

                    <p>
                        Próximamente encontrarás aquí los canales
                        de contacto de MateCode.
                    </p>

                    <p className="info-page__muted">
                        Actualmente no se ha configurado un canal
                        oficial de atención dentro de esta página.
                        Se publicarán sus datos cuando estén
                        disponibles y hayan sido verificados.
                    </p>
                </section>

                <section
                    className="info-page__card"
                    aria-labelledby="contact-help-heading"
                >
                    <div className="info-page__card-heading">
                        <span
                            className="info-page__step"
                            aria-hidden="true"
                        >
                            02
                        </span>

                        <h2 id="contact-help-heading">
                            Centro de ayuda
                        </h2>
                    </div>

                    <p>
                        Puedes consultar orientaciones sobre
                        navegación, gestión de tareas, estados,
                        fechas y acceso a la plataforma.
                    </p>

                    <Link
                        to="/ayuda"
                        className="info-page__inline-link"
                    >
                        Consultar Ayuda
                    </Link>
                </section>

                <section
                    className="info-page__card"
                    aria-labelledby="contact-account-heading"
                >
                    <div className="info-page__card-heading">
                        <span
                            className="info-page__step"
                            aria-hidden="true"
                        >
                            03
                        </span>

                        <h2 id="contact-account-heading">
                            {isAuthenticated
                                ? 'Mi cuenta'
                                : 'Acceso a MateCode'}
                        </h2>
                    </div>

                    {isAuthenticated ? (
                        <>
                            <p>
                                Puedes consultar los datos de tu cuenta
                                desde la sección Mi cuenta de tu espacio
                                de trabajo.
                            </p>

                            <Link
                                to="/perfil"
                                className="info-page__inline-link"
                            >
                                Abrir Mi cuenta
                            </Link>
                        </>
                    ) : (
                        <>
                            <p>
                                Si ya tienes una cuenta, puedes iniciar
                                sesión para acceder a tus tareas y
                                a tu espacio personal.
                            </p>

                            <Link
                                to="/iniciar-sesion"
                                className="info-page__inline-link"
                            >
                                Iniciar sesión
                            </Link>
                        </>
                    )}
                </section>
            </div>

            <nav
                className="info-page__footer-nav"
                aria-label="Regresar desde Contacto"
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
