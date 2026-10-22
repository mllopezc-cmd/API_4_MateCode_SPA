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
} from '@testing-library/react';

import ThemeToggle from '../src/components/ThemeToggle';

import {
    ThemeProvider,
} from '../src/theme/ThemeProvider';

import {
    THEME_STORAGE_KEY,
} from '../src/theme/theme';

function mountToggle() {
    return render(
        <ThemeProvider>
            <ThemeToggle />
        </ThemeProvider>,
    );
}

describe('Preferencia de tema MateCode', () => {
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

    it(
        'inicia en modo oscuro sin preferencia guardada',
        () => {
            mountToggle();

            expect(
                document.documentElement.dataset.theme,
            ).toBe('dark');

            expect(
                screen.getByRole('button', {
                    name: 'Activar modo claro',
                }),
            ).toBeTruthy();
        },
    );

    it(
        'permite alternar y persiste la preferencia',
        () => {
            mountToggle();

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Activar modo claro',
                }),
            );

            expect(
                document.documentElement.dataset.theme,
            ).toBe('light');

            expect(
                window.localStorage.getItem(
                    THEME_STORAGE_KEY,
                ),
            ).toBe('light');

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Activar modo oscuro',
                }),
            );

            expect(
                document.documentElement.dataset.theme,
            ).toBe('dark');
        },
    );

    it(
        'recupera la preferencia guardada',
        () => {
            window.localStorage.setItem(
                THEME_STORAGE_KEY,
                'light',
            );

            mountToggle();

            expect(
                document.documentElement.dataset.theme,
            ).toBe('light');
        },
    );

    it(
        'permite cambiar cuando localStorage falla',
        () => {
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

            mountToggle();

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Activar modo claro',
                }),
            );

            expect(
                document.documentElement.dataset.theme,
            ).toBe('light');
        },
    );
});
