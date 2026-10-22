import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';

import {
    MemoryRouter,
    Route,
    Routes,
} from 'react-router-dom';

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import PrivateLayout from '../src/components/PrivateLayout';
import { ThemeProvider } from '../src/theme/ThemeProvider';

/*
 * Etapa 8 - Bloque 4A.
 *
 * Las pruebas verifican:
 * - Saludo de la sesión.
 * - Navegación de escritorio.
 * - Menú hamburguesa.
 * - Iconografía de Configuración.
 * - Cierre accesible del menú.
 * - Cierre de sesión y reintentos.
 */

const { mockLogout } = vi.hoisted(() => ({
    mockLogout: vi.fn(),
}));

vi.mock('../src/context/AuthContext', () => ({
    useAuth: () => ({
        status: 'authenticated',
        user: {
            uid: 'test-user',
            displayName: 'Mauricio Lopez',
            email: 'mauricio@example.com',
            emailVerified: true,
        },
        logout: mockLogout,
    }),
}));

function renderLayout() {
    return render(
        <ThemeProvider>
            <MemoryRouter initialEntries={['/panel']}>
                <Routes>
                    <Route element={<PrivateLayout />}>
                        <Route
                            path="/panel"
                            element={<p>Panel de prueba</p>}
                        />

                        <Route
                            path="/configuracion"
                            element={<p>Configuración de prueba</p>}
                        />

                        <Route
                            path="/ayuda"
                            element={<p>Ayuda de prueba</p>}
                        />

                        <Route
                            path="/contacto"
                            element={<p>Contacto de prueba</p>}
                        />
                    </Route>

                    <Route
                        path="/iniciar-sesion"
                        element={<p>Vista de inicio de sesión</p>}
                    />
                </Routes>
            </MemoryRouter>
        </ThemeProvider>,
    );
}

beforeEach(() => {
    mockLogout.mockReset();
    mockLogout.mockResolvedValue(undefined);

    window.localStorage.clear();

    document.documentElement.removeAttribute(
        'data-theme',
    );
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('Refinamiento de navegación MateCode', () => {
    it(
        'muestra el saludo con el nombre del usuario',
        () => {
            renderLayout();

            expect(
                screen.getByText('¡Hola, Mauricio!'),
            ).toBeInTheDocument();

            expect(
                screen.getByText('Mauricio Lopez'),
            ).toBeInTheDocument();
        },
    );

    it(
        'utiliza el icono de configuración en escritorio y móvil',
        () => {
            renderLayout();

            /*
             * En escritorio, Configuración es un
             * enlace permanente del menú lateral.
             */
            const sidebar = screen.getByRole(
                'navigation',
                { name: 'Opciones de cuenta' },
            );

            const desktopSettings = within(
                sidebar,
            ).getByRole('link', {
                name: 'Configuración',
            });

            expect(desktopSettings).toHaveAttribute(
                'href',
                '/configuracion',
            );

            expect(
                desktopSettings.querySelector(
                    'svg[data-icon="settings"]',
                ),
            ).not.toBeNull();

            /*
             * En móvil, primero debe abrirse
             * el menú hamburguesa.
             */
            const header = screen.getByRole('banner');

            const openMenuButton = within(
                header,
            ).getByRole('button', {
                name: 'Abrir menú',
            });

            expect(
                openMenuButton.querySelector(
                    'svg[data-icon="menu"]',
                ),
            ).not.toBeNull();

            expect(openMenuButton).toHaveAttribute(
                'aria-expanded',
                'false',
            );

            fireEvent.click(openMenuButton);

            expect(
                within(header).getByRole('button', {
                    name: 'Cerrar menú',
                }),
            ).toHaveAttribute('aria-expanded', 'true');

            const mobileMenu = screen.getByRole(
                'navigation',
                { name: 'Menú de cuenta móvil' },
            );

            const mobileSettings = within(
                mobileMenu,
            ).getByRole('link', {
                name: 'Configuración',
            });

            expect(mobileSettings).toHaveAttribute(
                'href',
                '/configuracion',
            );

            expect(
                mobileSettings.querySelector(
                    'svg[data-icon="settings"]',
                ),
            ).not.toBeNull();

            expect(desktopSettings.getAttribute('href')).toBe(
                mobileSettings.getAttribute('href'),
            );

            expect(
                within(mobileMenu).getByRole('link', {
                    name: 'Ayuda',
                }),
            ).toHaveAttribute('href', '/ayuda');

            expect(
                within(mobileMenu).getByRole('link', {
                    name: 'Contacto',
                }),
            ).toHaveAttribute('href', '/contacto');
        },
    );

    it(
        'cierra el menú móvil mediante Escape y clic exterior',
        () => {
            renderLayout();

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Abrir menú',
                }),
            );

            expect(
                screen.getByRole('navigation', {
                    name: 'Menú de cuenta móvil',
                }),
            ).toBeInTheDocument();

            fireEvent.keyDown(document, {
                key: 'Escape',
            });

            expect(
                screen.queryByRole('navigation', {
                    name: 'Menú de cuenta móvil',
                }),
            ).not.toBeInTheDocument();

            expect(
                screen.getByRole('button', {
                    name: 'Abrir menú',
                }),
            ).toHaveFocus();

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Abrir menú',
                }),
            );

            fireEvent.pointerDown(document.body);

            expect(
                screen.queryByRole('navigation', {
                    name: 'Menú de cuenta móvil',
                }),
            ).not.toBeInTheDocument();
        },
    );

    it(
        'cierra la sesión desde escritorio sin duplicar solicitudes',
        async () => {
            let resolveLogout!: () => void;

            mockLogout.mockImplementationOnce(
                () =>
                    new Promise<void>((resolve) => {
                        resolveLogout = resolve;
                    }),
            );

            renderLayout();

            const logoutButton = screen.getByRole(
                'button',
                { name: 'Cerrar sesión' },
            );

            fireEvent.click(logoutButton);

            expect(
                screen.getByRole('button', {
                    name: 'Cerrando sesión…',
                }),
            ).toBeDisabled();

            expect(mockLogout).toHaveBeenCalledTimes(1);

            await act(async () => {
                resolveLogout();
            });

            expect(
                await screen.findByText(
                    'Vista de inicio de sesión',
                ),
            ).toBeInTheDocument();
        },
    );

    it(
        'muestra el error de cierre y permite reintentar',
        async () => {
            mockLogout
                .mockRejectedValueOnce(
                    new Error('Error de Firebase'),
                )
                .mockResolvedValueOnce(undefined);

            renderLayout();

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Cerrar sesión',
                }),
            );

            expect(
                await screen.findByRole('alert'),
            ).toHaveTextContent(
                'No se pudo cerrar la sesión. Inténtalo de nuevo.',
            );

            expect(
                screen.getByRole('button', {
                    name: 'Cerrar sesión',
                }),
            ).toBeEnabled();

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Cerrar sesión',
                }),
            );

            await waitFor(() => {
                expect(mockLogout).toHaveBeenCalledTimes(2);
            });

            expect(
                await screen.findByText(
                    'Vista de inicio de sesión',
                ),
            ).toBeInTheDocument();
        },
    );

    it(
        'permite cerrar sesión desde el menú hamburguesa',
        async () => {
            renderLayout();

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Abrir menú',
                }),
            );

            const mobileMenu = screen.getByRole(
                'navigation',
                { name: 'Menú de cuenta móvil' },
            );

            fireEvent.click(
                within(mobileMenu).getByRole('button', {
                    name: 'Cerrar sesión',
                }),
            );

            expect(
                await screen.findByText(
                    'Vista de inicio de sesión',
                ),
            ).toBeInTheDocument();

            expect(mockLogout).toHaveBeenCalledTimes(1);
        },
    );
});
