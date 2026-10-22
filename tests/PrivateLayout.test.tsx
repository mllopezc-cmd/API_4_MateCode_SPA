import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from '@testing-library/react';

import {
    MemoryRouter,
    Route,
    Routes,
} from 'react-router-dom';

import PrivateLayout from '../src/components/PrivateLayout';
import { ThemeProvider } from '../src/theme/ThemeProvider';

vi.mock('../src/context/AuthContext', () => ({
    useAuth: () => ({
        user: {
            displayName: 'Alex',
            email: 'alex@example.com',
        },
    }),
}));

function renderPrivateLayout(
    initialPath = '/panel',
) {
    return render(
        <ThemeProvider>
            <MemoryRouter initialEntries={[initialPath]}>
                <Routes>
                    <Route element={<PrivateLayout />}>
                        <Route
                            path="/panel"
                            element={<p>Vista del panel</p>}
                        />

                        <Route
                            path="/tareas"
                            element={<p>Vista de tareas</p>}
                        />

                        <Route
                            path="/tareas/pendientes"
                            element={<p>Tareas pendientes</p>}
                        />

                        <Route
                            path="/perfil"
                            element={<p>Vista de cuenta</p>}
                        />

                        <Route
                            path="/configuracion"
                            element={<p>Vista de configuración</p>}
                        />
                    </Route>
                </Routes>
            </MemoryRouter>
        </ThemeProvider>,
    );
}

describe('PrivateLayout de MateCode', () => {
    beforeEach(() => {
        window.localStorage.clear();

        document.documentElement.removeAttribute(
            'data-theme',
        );
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('muestra las opciones de navegación', () => {
        renderPrivateLayout();

        const sidebar = screen.getByRole(
            'navigation',
            { name: 'Navegación lateral' },
        );

        expect(
            within(sidebar).getByRole('link', {
                name: 'Inicio',
            }),
        ).toBeTruthy();

        expect(
            within(sidebar).getByRole('link', {
                name: 'Mis tareas',
            }),
        ).toBeTruthy();

        expect(
            within(sidebar).getByRole('link', {
                name: 'Mi cuenta',
            }),
        ).toBeTruthy();
    });

    it(
        'mantiene activa la sección de tareas en sus rutas',
        () => {
            renderPrivateLayout('/tareas/pendientes');

            const sidebar = screen.getByRole(
                'navigation',
                { name: 'Navegación lateral' },
            );

            const tasksLink = within(sidebar).getByRole(
                'link',
                { name: 'Mis tareas' },
            );

            expect(
                tasksLink.getAttribute('aria-current'),
            ).toBe('page');
        },
    );

    it('permite contraer y expandir el menú', () => {
        renderPrivateLayout();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Contraer menú',
            }),
        );

        expect(
            screen.getByRole('button', {
                name: 'Expandir menú',
            }),
        ).toBeTruthy();

        expect(
            document.querySelector(
                '.matecode-shell--collapsed',
            ),
        ).toBeTruthy();
    });

    it(
        'permite navegar desde la barra inferior',
        () => {
            renderPrivateLayout('/tareas/pendientes');

            const bottomNav = screen.getByRole(
                'navigation',
                { name: 'Navegación inferior' },
            );

            fireEvent.click(
                within(bottomNav).getByRole('link', {
                    name: 'Inicio',
                }),
            );

            expect(
                screen.getByText('Vista del panel'),
            ).toBeTruthy();
        },
    );

    it('permite cambiar el tema', () => {
        renderPrivateLayout();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Activar modo claro',
            }),
        );

        expect(
            document.documentElement.dataset.theme,
        ).toBe('light');
    });
});
