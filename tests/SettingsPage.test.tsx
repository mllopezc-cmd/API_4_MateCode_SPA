import {
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';

import { MemoryRouter } from 'react-router-dom';

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import SettingsPage from '../src/pages/settings/SettingsPage';
import ThemeToggle from '../src/components/ThemeToggle';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { THEME_STORAGE_KEY } from '../src/theme/theme';

function renderSettings() {
    return render(
        <MemoryRouter initialEntries={['/configuracion']}>
            <ThemeProvider>
                <ThemeToggle />
                <SettingsPage />
            </ThemeProvider>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('Configuración de MateCode', () => {
    it('muestra las secciones disponibles sin controles ficticios', () => {
        renderSettings();

        expect(
            screen.getByRole('heading', { name: 'Configuración' }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('heading', { name: 'Apariencia' }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('heading', { name: 'Cuenta y seguridad' }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('heading', { name: 'Ayuda y soporte' }),
        ).toBeInTheDocument();

        expect(
            screen.queryByText(/Próximamente podrás personalizar/),
        ).not.toBeInTheDocument();
    });

    it('selecciona modo oscuro cuando no hay preferencias guardadas', () => {
        renderSettings();

        expect(
            screen.getByRole('radio', { name: /Modo oscuro/ }),
        ).toBeChecked();

        expect(
            screen.getByRole('radio', { name: /Modo claro/ }),
        ).not.toBeChecked();

        expect(
            screen.getByText('Modo oscuro activo.'),
        ).toBeInTheDocument();

        expect(
            document.documentElement.dataset.theme,
        ).toBe('dark');
    });

    it('aplica y persiste el modo claro desde Configuración', () => {
        renderSettings();

        fireEvent.click(
            screen.getByRole('radio', { name: /Modo claro/ }),
        );

        expect(
            screen.getByRole('radio', { name: /Modo claro/ }),
        ).toBeChecked();

        expect(
            document.documentElement.dataset.theme,
        ).toBe('light');

        expect(
            window.localStorage.getItem(THEME_STORAGE_KEY),
        ).toBe('light');

        expect(
            screen.getByText('Modo claro activo.'),
        ).toBeInTheDocument();
    });

    it('recupera el modo claro guardado al montar la página', () => {
        window.localStorage.setItem(
            THEME_STORAGE_KEY,
            'light',
        );

        renderSettings();

        expect(
            screen.getByRole('radio', { name: /Modo claro/ }),
        ).toBeChecked();

        expect(
            document.documentElement.dataset.theme,
        ).toBe('light');
    });

    it('se sincroniza con el interruptor de tema de la navegación', () => {
        renderSettings();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Activar modo claro',
            }),
        );

        expect(
            screen.getByRole('radio', { name: /Modo claro/ }),
        ).toBeChecked();

        fireEvent.click(
            screen.getByRole('radio', { name: /Modo oscuro/ }),
        );

        expect(
            screen.getByRole('button', {
                name: 'Activar modo claro',
            }),
        ).toBeInTheDocument();

        expect(
            document.documentElement.dataset.theme,
        ).toBe('dark');
    });

    it('mantiene funcionales los enlaces a secciones existentes', () => {
        renderSettings();

        expect(
            screen.getByRole('link', { name: /Abrir mi perfil/ }),
        ).toHaveAttribute('href', '/perfil');

        expect(
            screen.getByRole('link', { name: /Ir a Ayuda/ }),
        ).toHaveAttribute('href', '/ayuda');

        expect(
            screen.getByRole('link', { name: /Ir a Contacto/ }),
        ).toHaveAttribute('href', '/contacto');

        expect(
            screen.getByRole('link', { name: 'Volver al panel' }),
        ).toHaveAttribute('href', '/panel');
    });

    it('permite cambiar de tema aunque falle localStorage', () => {
        vi.spyOn(
            Storage.prototype,
            'getItem',
        ).mockImplementation(() => {
            throw new Error('Bloqueado');
        });

        vi.spyOn(
            Storage.prototype,
            'setItem',
        ).mockImplementation(() => {
            throw new Error('Bloqueado');
        });

        renderSettings();

        fireEvent.click(
            screen.getByRole('radio', { name: /Modo claro/ }),
        );

        expect(
            document.documentElement.dataset.theme,
        ).toBe('light');

        expect(
            screen.getByRole('radio', { name: /Modo claro/ }),
        ).toBeChecked();
    });
});
