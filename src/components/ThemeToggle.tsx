import { useTheme } from '../theme/ThemeContext';

/**
 * Selector de tema de MateCode.
 *
 * El bloque 1 lo mostrará en una franja superior.
 * El bloque 2 lo integrará en la navegación final.
 */
export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    const isDark = theme === 'dark';

    const accessibleLabel = isDark
        ? 'Activar modo claro'
        : 'Activar modo oscuro';

    return (
        <button
            type="button"
            className="matecode-theme-toggle"
            onClick={toggleTheme}
            aria-label={accessibleLabel}
            title={accessibleLabel}
            data-testid="theme-toggle"
        >
            {isDark ? (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                >
                    <circle cx="12" cy="12" r="4" />
                    <path
                        d={
                            'M12 2v2m0 16v2' +
                            'M4.93 4.93l1.42 1.42' +
                            'm11.3 11.3 1.42 1.42' +
                            'M2 12h2m16 0h2' +
                            'M4.93 19.07l1.42-1.42' +
                            'm11.3-11.3 1.42-1.42'
                        }
                    />
                </svg>
            ) : (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path
                        d={
                            'M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5' +
                            'a8.5 8.5 0 1 0 11 11Z'
                        }
                    />
                </svg>
            )}

            <span>{isDark ? 'Claro' : 'Oscuro'}</span>
        </button>
    );
}
