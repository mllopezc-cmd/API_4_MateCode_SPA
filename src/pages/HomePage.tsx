import { Link } from 'react-router-dom';

import './HomePage.css';

/**
 * MateCode Premium Cyber-Executive
 * Etapa 8 - Mejora visual del inicio público.
 *
 * Mantiene las cinco rutas originales.
 * No modifica autenticación ni Firebase.
 */
export default function HomePage() {
    return (
        <main className="page-shell home-page home-page--premium">
            <div className="home-page__intro">
                <p className="home-page__eyebrow">
                    TU ESPACIO DE TRABAJO
                </p>

                <h1>MateCode</h1>

                <p className="home-page__lead">
                    Organiza tus tareas y avanza en tus proyectos.
                </p>
            </div>

            <nav
                className="home-actions"
                aria-label="Navegación principal"
            >
                <div className="home-actions__primary">
                    <Link
                        to="/iniciar-sesion"
                        className="home-actions__link home-actions__link--primary"
                    >
                        <span>Iniciar sesión</span>

                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <path d="M5 12h14" />
                            <path d="m13 6 6 6-6 6" />
                        </svg>
                    </Link>

                    <Link
                        to="/crear-cuenta"
                        className="home-actions__link home-actions__link--outline"
                    >
                        <span>Crear cuenta</span>

                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                        </svg>
                    </Link>
                </div>

                <div className="home-actions__secondary">
                    <Link
                        to="/acerca-de"
                        className="home-actions__link home-actions__link--secondary"
                    >
                        Acerca de
                    </Link>

                    <Link
                        to="/contacto"
                        className="home-actions__link home-actions__link--secondary"
                    >
                        Contacto
                    </Link>

                    <Link
                        to="/ayuda"
                        className="home-actions__link home-actions__link--secondary"
                    >
                        Ayuda
                    </Link>
                </div>
            </nav>
        </main>
    );
}
