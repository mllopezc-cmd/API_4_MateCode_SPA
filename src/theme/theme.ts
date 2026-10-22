/**
 * MateCode SPA - Etapa 8 / Bloque 1
 * Preferencia visual local.
 *
 * No modifica Firebase ni el modelo de usuario.
 */

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'matecode.theme';

/**
 * Lee la preferencia almacenada.
 * En la primera visita, utiliza modo oscuro.
 */
export function readStoredTheme(): Theme {
    if (typeof window === 'undefined') {
        return 'dark';
    }

    try {
        const stored = window.localStorage.getItem(
            THEME_STORAGE_KEY,
        );

        return stored === 'light' ? 'light' : 'dark';
    } catch {
        // La aplicación continúa aunque el almacenamiento falle.
        return 'dark';
    }
}

/**
 * Guarda la preferencia cuando localStorage está disponible.
 */
export function persistTheme(theme: Theme): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            THEME_STORAGE_KEY,
            theme,
        );
    } catch {
        // El cambio de tema permanece operativo en la sesión.
    }
}

/**
 * Aplica el tema sobre el elemento raíz del documento.
 */
export function applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
}
