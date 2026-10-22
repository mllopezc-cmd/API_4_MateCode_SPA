import { Link } from 'react-router-dom';

import { useTheme } from '../../theme/ThemeContext';
import type { Theme } from '../../theme/theme';

import './SettingsPage.css';

type SettingsIconName =
    | 'settings'
    | 'palette'
    | 'moon'
    | 'sun'
    | 'user'
    | 'help'
    | 'mail'
    | 'arrow';

function SettingsIcon({ name }: { name: SettingsIconName }) {
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
            {name === 'settings' && (
                <>
                    <path d="M4 7h16M4 12h16M4 17h16" />
                    <circle cx="9" cy="7" r="2" fill="currentColor" stroke="#fff" />
                    <circle cx="15" cy="12" r="2" fill="currentColor" stroke="#fff" />
                    <circle cx="10" cy="17" r="2" fill="currentColor" stroke="#fff" />
                </>
            )}
            {name === 'palette' && (
                <>
                    <path d="M12 3a9 9 0 0 0 0 18h1.3a2 2 0 0 0 1.6-3.2 1.9 1.9 0 0 1 1.5-3h1.1A4.5 4.5 0 0 0 22 10.3 9 9 0 0 0 12 3Z" />
                    <circle cx="7.5" cy="12" r=".8" />
                    <circle cx="10" cy="7.5" r=".8" />
                    <circle cx="15" cy="8" r=".8" />
                </>
            )}
            {name === 'moon' && (
                <path d="M20.3 14.3A8.5 8.5 0 0 1 9.7 3.7 8.5 8.5 0 1 0 20.3 14.3Z" />
            )}
            {name === 'sun' && (
                <>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </>
            )}
            {name === 'user' && (
                <>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2" />
                </>
            )}
            {name === 'help' && (
                <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9.4 9a2.7 2.7 0 0 1 5.2 1c0 1.7-2.6 2.1-2.6 4" />
                    <path d="M12 17.6h.01" />
                </>
            )}
            {name === 'mail' && (
                <>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m4 7 8 6 8-6" />
                </>
            )}
            {name === 'arrow' && <path d="M5 12h14m-6-6 6 6-6 6" />}
        </svg>
    );
}

interface ThemeOptionProps {
    value: Theme;
    title: string;
    description: string;
    active: boolean;
    onSelect: (theme: Theme) => void;
}

function ThemeOption({
    value,
    title,
    description,
    active,
    onSelect,
}: ThemeOptionProps) {
    return (
        <label className={`settings-theme-option${active ? ' is-selected' : ''}`}>
            <input
                type="radio"
                name="matecode-settings-theme"
                value={value}
                checked={active}
                onChange={() => onSelect(value)}
            />
            <span
                className={`settings-theme-preview settings-theme-preview--${value}`}
                aria-hidden="true"
            >
                <span className="settings-theme-preview__top">
                    <span /><span /><span />
                </span>
                <span className="settings-theme-preview__body">
                    <span className="settings-theme-preview__rail">
                        <span /><span /><span />
                    </span>
                    <span className="settings-theme-preview__content">
                        <span className="settings-theme-preview__line" />
                        <span className="settings-theme-preview__tile" />
                        <span className="settings-theme-preview__line settings-theme-preview__line--short" />
                    </span>
                </span>
            </span>
            <span className="settings-theme-option__details">
                <span className="settings-theme-option__icon">
                    <SettingsIcon name={value === 'dark' ? 'moon' : 'sun'} />
                </span>
                <span className="settings-theme-option__copy">
                    <strong>{title}</strong>
                    <span>{description}</span>
                </span>
                <span className="settings-theme-option__indicator" aria-hidden="true" />
            </span>
        </label>
    );
}

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    return (
        <main className="page-shell settings-page settings-page--premium">
            <header className="settings-hero">
                <span className="settings-hero__icon">
                    <SettingsIcon name="settings" />
                </span>
                <div>
                    <span className="settings-eyebrow">PERSONALIZACIÓN</span>
                    <h1>Configuración</h1>
                    <p>Adapta la apariencia de MateCode y accede a las opciones de tu cuenta.</p>
                </div>
            </header>

            <div className="settings-sections">
                <section className="settings-section" aria-labelledby="settings-appearance-title">
                    <div className="settings-section__heading">
                        <span className="settings-section__icon">
                            <SettingsIcon name="palette" />
                        </span>
                        <div>
                            <h2 id="settings-appearance-title">Apariencia</h2>
                            <p>Selecciona el tema que prefieres para tu espacio de trabajo.</p>
                        </div>
                    </div>

                    <fieldset className="settings-theme-fieldset" aria-describedby="settings-theme-note">
                        <legend>Tema de la interfaz</legend>
                        <div className="settings-theme-grid">
                            <ThemeOption
                                value="dark"
                                title="Modo oscuro"
                                description="Contraste nocturno Cyber-Executive"
                                active={theme === 'dark'}
                                onSelect={setTheme}
                            />
                            <ThemeOption
                                value="light"
                                title="Modo claro"
                                description="Superficies claras para el día"
                                active={theme === 'light'}
                                onSelect={setTheme}
                            />
                        </div>
                    </fieldset>

                    <p className="settings-theme-note" id="settings-theme-note">
                        <span className="settings-theme-note__dot" aria-hidden="true" />
                        <span role="status" aria-live="polite">
                            {theme === 'dark' ? 'Modo oscuro activo.' : 'Modo claro activo.'}
                        </span>{' '}
                        El cambio es inmediato y se conserva en este navegador cuando permite guardar preferencias.
                    </p>
                </section>

                <section className="settings-section" aria-labelledby="settings-account-title">
                    <div className="settings-section__heading">
                        <span className="settings-section__icon">
                            <SettingsIcon name="user" />
                        </span>
                        <div>
                            <h2 id="settings-account-title">Cuenta y seguridad</h2>
                            <p>Los datos personales y la contraseña se administran desde Mi cuenta.</p>
                        </div>
                    </div>
                    <Link className="settings-destination" to="/perfil">
                        <span className="settings-destination__mark">
                            <SettingsIcon name="user" />
                        </span>
                        <span className="settings-destination__copy">
                            <strong>Mi perfil y seguridad</strong>
                            <span>Nombre, contacto y cambio de contraseña.</span>
                        </span>
                        <span className="settings-destination__action">
                            Abrir mi perfil <SettingsIcon name="arrow" />
                        </span>
                    </Link>
                </section>

                <section className="settings-section" aria-labelledby="settings-support-title">
                    <div className="settings-section__heading">
                        <span className="settings-section__icon">
                            <SettingsIcon name="help" />
                        </span>
                        <div>
                            <h2 id="settings-support-title">Ayuda y soporte</h2>
                            <p>Encuentra orientación o consulta cómo ponerte en contacto.</p>
                        </div>
                    </div>
                    <div className="settings-destination-list">
                        <Link className="settings-destination" to="/ayuda">
                            <span className="settings-destination__mark">
                                <SettingsIcon name="help" />
                            </span>
                            <span className="settings-destination__copy">
                                <strong>Centro de ayuda</strong>
                                <span>Consulta la información disponible sobre MateCode.</span>
                            </span>
                            <span className="settings-destination__action">
                                Ir a Ayuda <SettingsIcon name="arrow" />
                            </span>
                        </Link>
                        <Link className="settings-destination" to="/contacto">
                            <span className="settings-destination__mark">
                                <SettingsIcon name="mail" />
                            </span>
                            <span className="settings-destination__copy">
                                <strong>Contacto</strong>
                                <span>Accede a la sección de comunicación y soporte.</span>
                            </span>
                            <span className="settings-destination__action">
                                Ir a Contacto <SettingsIcon name="arrow" />
                            </span>
                        </Link>
                    </div>
                </section>
            </div>

            <nav className="settings-footer" aria-label="Navegación de configuración">
                <Link to="/panel">Volver al panel</Link>
            </nav>
        </main>
    );
}
