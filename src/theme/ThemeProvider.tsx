import {
    useCallback,
    useLayoutEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import { ThemeContext } from './ThemeContext';

import {
    applyTheme,
    persistTheme,
    readStoredTheme,
    type Theme,
} from './theme';

interface ThemeProviderProps {
    children: ReactNode;
}

/**
 * Proveedor global de apariencia.
 *
 * - Oscuro por defecto.
 * - Recupera el tema guardado.
 * - Funciona si localStorage no está disponible.
 * - No introduce peticiones de red.
 */
export function ThemeProvider({
    children,
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        readStoredTheme,
    );

    useLayoutEffect(() => {
        applyTheme(theme);
        persistTheme(theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((currentTheme) =>
            currentTheme === 'dark' ? 'light' : 'dark',
        );
    }, []);

    const value = useMemo(
        () => ({
            theme,
            setTheme,
            toggleTheme,
        }),
        [theme, toggleTheme],
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}
