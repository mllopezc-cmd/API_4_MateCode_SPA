import { useEffect, useId, useRef, useState } from 'react';
import {
    Link,
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import './PrivateLayoutHeader.css';

type IconName =
    | 'home'
    | 'tasks'
    | 'user'
    | 'settings'
    | 'help'
    | 'contact'
    | 'logout'
    | 'menu'
    | 'close'
    | 'collapse-left'
    | 'collapse-right';

type NavigationItem = {
    to: string;
    label: string;
    icon: IconName;
};

const mainNavigation: NavigationItem[] = [
    { to: '/panel', label: 'Inicio', icon: 'home' },
    { to: '/tareas', label: 'Mis tareas', icon: 'tasks' },
    { to: '/perfil', label: 'Mi cuenta', icon: 'user' },
];

const utilityNavigation: NavigationItem[] = [
    {
        to: '/configuracion',
        label: 'Configuración',
        icon: 'settings',
    },
    { to: '/ayuda', label: 'Ayuda', icon: 'help' },
    { to: '/contacto', label: 'Contacto', icon: 'contact' },
];

function ShellIcon({ name }: { name: IconName }) {
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
            data-icon={name}
        >
            {name === 'home' && (
                <>
                    <path d="m3 10 9-7 9 7" />
                    <path d="M5 9v11h14V9" />
                    <path d="M9 20v-7h6v7" />
                </>
            )}

            {name === 'tasks' && (
                <>
                    <rect x="4" y="4" width="16" height="16" rx="3" />
                    <path d="m8 12 2.5 2.5L16 9" />
                </>
            )}

            {name === 'user' && (
                <>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2" />
                </>
            )}

            {name === 'settings' && (
                <>
                    <path
                        d={
                            'M10 2h4l.7 2.4 1.6.9 2.5-.6 ' +
                            '2 3.5-1.8 1.9v1.8l1.8 1.9 ' +
                            '-2 3.5-2.5-.6-1.6.9L14 22h-4 ' +
                            'l-.7-2.4-1.6-.9-2.5.6-2-3.5 ' +
                            'L5 13.9v-1.8l-1.8-1.9 2-3.5 ' +
                            '2.5.6 1.6-.9L10 2Z'
                        }
                    />
                    <circle cx="12" cy="12" r="3.25" />
                </>
            )}

            {name === 'help' && (
                <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9.4 9a2.8 2.8 0 1 1 4.8 2c-.8.8-2.2 1.3-2.2 2.8" />
                    <path d="M12 17.5h.01" />
                </>
            )}

            {name === 'contact' && (
                <>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m4 7 8 6 8-6" />
                </>
            )}

            {name === 'logout' && (
                <>
                    <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
                    <path d="M14 8l4 4-4 4M18 12H8" />
                </>
            )}

            {name === 'menu' && (
                <path d="M4 6h16M4 12h16M4 18h16" />
            )}

            {name === 'close' && (
                <path d="M5 5l14 14M19 5 5 19" />
            )}

            {name === 'collapse-left' && (
                <path d="m13 6-6 6 6 6m5-12-6 6 6 6" />
            )}

            {name === 'collapse-right' && (
                <path d="m6 6 6 6-6 6m5-12 6 6-6 6" />
            )}
        </svg>
    );
}

function getPageTitle(pathname: string): string {
    if (pathname === '/panel') return 'Mi inicio';
    if (pathname.startsWith('/tareas')) return 'Mis tareas';
    if (pathname === '/perfil') return 'Mi cuenta';
    if (pathname === '/configuracion') return 'Configuración';
    if (pathname === '/ayuda') return 'Ayuda';
    if (pathname === '/contacto') return 'Contacto';

    return 'Mi espacio de trabajo';
}

function NavigationLink({
    item,
    compact = false,
    onSelect,
}: {
    item: NavigationItem;
    compact?: boolean;
    onSelect?: () => void;
}) {
    return (
        <NavLink
            to={item.to}
            title={item.label}
            aria-label={item.label}
            onClick={onSelect}
            className={({ isActive }) =>
                [
                    'matecode-shell__nav-link',
                    isActive ? 'is-active' : '',
                    compact ? 'is-compact' : '',
                ]
                    .filter(Boolean)
                    .join(' ')
            }
        >
            <span className="matecode-shell__nav-icon">
                <ShellIcon name={item.icon} />
            </span>

            <span className="matecode-shell__nav-text">
                {item.label}
            </span>
        </NavLink>
    );
}

export default function PrivateLayout() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState('');

    const logoutBusyRef = useRef(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
    const mobileMenuId = useId();

    const userName =
        user?.displayName?.trim() ||
        user?.email?.split('@')[0]?.trim() ||
        '';

    const displayName = userName || 'Mi cuenta';

    const firstName = userName
        ? userName.split(/\s+/)[0]
        : '';

    const greeting = firstName
        ? `¡Hola, ${firstName}!`
        : '¡Hola!';

    const avatarLetter = userName
        ? userName.charAt(0).toUpperCase()
        : 'U';

    const pageTitle = getPageTitle(pathname);

    /*
     * Cierre accesible del menú móvil.
     * Escape devuelve el foco al botón.
     * Un clic fuera del menú también lo cierra.
     */
    useEffect(() => {
        if (!mobileMenuOpen) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false);
                mobileMenuButtonRef.current?.focus();
            }
        }

        function handlePointerDown(event: PointerEvent) {
            if (
                event.target instanceof Node &&
                !mobileMenuRef.current?.contains(event.target)
            ) {
                setMobileMenuOpen(false);
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('pointerdown', handlePointerDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [mobileMenuOpen]);

    /*
     * Cierre de sesión compartido.
     * Evita solicitudes duplicadas y conserva
     * la sesión cuando Firebase devuelve un error.
     */
    async function handleLogout() {
        if (logoutBusyRef.current) return;

        logoutBusyRef.current = true;
        setIsLoggingOut(true);
        setLogoutError('');

        try {
            await logout();

            setMobileMenuOpen(false);
            navigate('/iniciar-sesion', { replace: true });
        } catch {
            logoutBusyRef.current = false;
            setIsLoggingOut(false);
            setLogoutError(
                'No se pudo cerrar la sesión. Inténtalo de nuevo.',
            );
        }
    }

    return (
        <div
            className={[
                'matecode-shell',
                collapsed ? 'matecode-shell--collapsed' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {/* Barra lateral de escritorio */}
            <aside
                id="matecode-desktop-sidebar"
                className="matecode-shell__sidebar"
            >
                <Link
                    to="/panel"
                    className="matecode-shell__brand"
                    aria-label="MateCode - Ir al inicio"
                    title="MateCode"
                >
                    <span className="matecode-shell__brand-mark">
                        <span aria-hidden="true">M</span>
                    </span>

                    <span className="matecode-shell__brand-copy">
                        <strong>MateCode</strong>
                        <small>PRODUCTIVIDAD INTELIGENTE</small>
                    </span>
                </Link>

                <div className="matecode-shell__sidebar-heading">
                    MI ESPACIO
                </div>

                <nav
                    className="matecode-shell__desktop-nav"
                    aria-label="Navegación lateral"
                >
                    {mainNavigation.map((item) => (
                        <NavigationLink key={item.to} item={item} />
                    ))}
                </nav>

                <div className="matecode-shell__sidebar-bottom">
                    <nav aria-label="Opciones de cuenta">
                        {utilityNavigation.map((item) => (
                            <NavigationLink key={item.to} item={item} />
                        ))}
                    </nav>

                    <button
                        type="button"
                        className="matecode-shell__logout"
                        onClick={() => {
                            void handleLogout();
                        }}
                        disabled={isLoggingOut}
                    >
                        <span className="matecode-shell__nav-icon">
                            <ShellIcon name="logout" />
                        </span>

                        <span className="matecode-shell__nav-text">
                            {isLoggingOut
                                ? 'Cerrando sesión…'
                                : 'Cerrar sesión'}
                        </span>
                    </button>
                </div>
            </aside>

            {/* Pestaña de contraer situada a media altura */}
            <button
                type="button"
                className="matecode-shell__rail-toggle"
                onClick={() => setCollapsed((value) => !value)}
                aria-label={
                    collapsed ? 'Expandir menú' : 'Contraer menú'
                }
                title={
                    collapsed ? 'Expandir menú' : 'Contraer menú'
                }
                aria-expanded={!collapsed}
                aria-controls="matecode-desktop-sidebar"
            >
                <ShellIcon
                    name={
                        collapsed
                            ? 'collapse-right'
                            : 'collapse-left'
                    }
                />
            </button>

            {/* Cabecera y contenido */}
            <div className="matecode-shell__workspace">
                <header className="matecode-shell__topbar">
                    <Link
                        to="/panel"
                        className="matecode-shell__mobile-brand"
                        aria-label="MateCode - Ir al inicio"
                        title="MateCode"
                    >
                        <span className="matecode-shell__brand-mark">
                            <span aria-hidden="true">M</span>
                        </span>
                    </Link>

                    <div className="matecode-shell__heading">
                        <span className="matecode-shell__eyebrow">
                            MI ESPACIO DE TRABAJO
                        </span>

                        <span className="matecode-shell__page-title">
                            {pageTitle}
                        </span>

                        <span
                            className="matecode-shell__mobile-greeting"
                            title={greeting}
                        >
                            {greeting}
                        </span>
                    </div>

                    <div className="matecode-shell__top-actions">
                        <ThemeToggle />

                        {/* Hamburguesa exclusiva de móvil */}
                        <div
                            className="matecode-shell__mobile-menu-wrap"
                            ref={mobileMenuRef}
                        >
                            <button
                                type="button"
                                ref={mobileMenuButtonRef}
                                className="matecode-shell__mobile-menu-trigger"
                                aria-label={
                                    mobileMenuOpen
                                        ? 'Cerrar menú'
                                        : 'Abrir menú'
                                }
                                aria-expanded={mobileMenuOpen}
                                aria-controls={mobileMenuId}
                                onClick={() =>
                                    setMobileMenuOpen((value) => !value)
                                }
                            >
                                <ShellIcon
                                    name={mobileMenuOpen ? 'close' : 'menu'}
                                />
                            </button>

                            {mobileMenuOpen && (
                                <div
                                    id={mobileMenuId}
                                    className="matecode-shell__mobile-menu-panel"
                                    role="navigation"
                                    aria-label="Menú de cuenta móvil"
                                >
                                    {utilityNavigation.map((item) => (
                                        <NavigationLink
                                            key={item.to}
                                            item={item}
                                            onSelect={() =>
                                                setMobileMenuOpen(false)
                                            }
                                        />
                                    ))}

                                    <div className="matecode-shell__mobile-menu-divider" />

                                    <button
                                        type="button"
                                        className="matecode-shell__logout matecode-shell__logout--mobile"
                                        onClick={() => {
                                            void handleLogout();
                                        }}
                                        disabled={isLoggingOut}
                                    >
                                        <span className="matecode-shell__nav-icon">
                                            <ShellIcon name="logout" />
                                        </span>

                                        <span className="matecode-shell__nav-text">
                                            {isLoggingOut
                                                ? 'Cerrando sesión…'
                                                : 'Cerrar sesión'}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <Link
                            to="/perfil"
                            className="matecode-shell__account"
                            aria-label={
                                userName
                                    ? `Mi cuenta de ${displayName}`
                                    : 'Mi cuenta'
                            }
                            title={displayName}
                        >
                            <span className="matecode-shell__avatar">
                                {avatarLetter}
                            </span>

                            <span className="matecode-shell__account-name">
                                {displayName}
                            </span>
                        </Link>
                    </div>
                </header>

                {logoutError && (
                    <p
                        className="matecode-shell__logout-error"
                        role="alert"
                    >
                        {logoutError}
                    </p>
                )}

                <div className="matecode-shell__content">
                    <Outlet />
                </div>
            </div>

            {/* Navegación inferior móvil */}
            <nav
                className="matecode-shell__bottom-nav"
                aria-label="Navegación inferior"
            >
                {mainNavigation.map((item) => (
                    <NavigationLink
                        key={item.to}
                        item={item}
                        compact
                    />
                ))}
            </nav>
        </div>
    );
}
