import { createContext, useContext } from 'react';

import type { Theme } from './theme';

export interface ThemeContextValue {
    theme: Theme;
    setTheme: (nextTheme: Theme) => void;
    toggleTheme: () => void;
}

export const ThemeContext =
    createContext<ThemeContextValue | null>(null);

/**
 * Permite consultar o cambiar el tema desde
 * cualquier componente dentro de ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error(
            'useTheme necesita un ThemeProvider.',
        );
    }

    return context;
}
