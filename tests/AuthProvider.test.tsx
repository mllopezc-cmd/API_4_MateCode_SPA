import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';

const mocks = vi.hoisted(() => ({
    auth: { currentUser: null },
    getAuth: vi.fn(),
    onAuthStateChanged: vi.fn(),
    getFirebaseApp: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    unsubscribe: vi.fn(),
    nextCallback: undefined as unknown,
    errorCallback: undefined as unknown,
}));

vi.mock('firebase/auth', () => ({
    getAuth: mocks.getAuth,
    onAuthStateChanged: mocks.onAuthStateChanged,
}));

vi.mock('../src/lib/firebase', () => ({
    getFirebaseApp: mocks.getFirebaseApp,
}));

vi.mock('../src/services/authService', () => ({
    login: mocks.login,
    logout: mocks.logout,
}));

import { AuthProvider } from '../src/context/AuthProvider';
import { useAuth } from '../src/context/AuthContext';

function AuthProbe() {
    const {
        status,
        user,
        isAuthenticated,
        logout,
        retryInitialization,
    } = useAuth();

    return (
        <section>
            <output data-testid="auth-status">{status}</output>
            <output data-testid="auth-user">
                {user?.uid ?? 'sin-usuario'}
            </output>
            <output data-testid="is-authenticated">
                {String(isAuthenticated)}
            </output>

            <button type="button" onClick={() => void logout()}>
                Cerrar sesión de prueba
            </button>

            <button
                type="button"
                onClick={retryInitialization}
            >
                Reintentar inicialización
            </button>
        </section>
    );
}

function renderProvider() {
    return render(
        <AuthProvider>
            <AuthProbe />
        </AuthProvider>,
    );
}

function emitAuthState(user: User | null) {
    const callback = mocks.nextCallback as
        | ((user: User | null) => void)
        | undefined;

    if (!callback) {
        throw new Error('El observador de Firebase no está registrado.');
    }

    act(() => {
        callback(user);
    });
}

describe('AuthProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.nextCallback = undefined;
        mocks.errorCallback = undefined;

        mocks.getFirebaseApp.mockReturnValue({
            name: '[DEFAULT]',
        });

        mocks.getAuth.mockReturnValue(mocks.auth);

        mocks.onAuthStateChanged.mockImplementation(
            (_auth, next, onError) => {
                mocks.nextCallback = next;
                mocks.errorCallback = onError;

                return mocks.unsubscribe;
            },
        );

        mocks.unsubscribe.mockImplementation(() => undefined);
        mocks.login.mockResolvedValue({
            user: {
                uid: 'usuario-1',
                emailVerified: true,
            },
        });
        mocks.logout.mockResolvedValue(undefined);
    });

    it('comienza en loading hasta recibir el estado de Firebase', () => {
        renderProvider();

        expect(screen.getByTestId('auth-status'))
            .toHaveTextContent('loading');
    });

    it('reconoce que no hay una sesión cuando Firebase devuelve null', async () => {
        renderProvider();

        emitAuthState(null);

        await waitFor(() => {
            expect(screen.getByTestId('auth-status'))
                .toHaveTextContent('unauthenticated');
        });

        expect(screen.getByTestId('is-authenticated'))
            .toHaveTextContent('false');
    });

    it('reconoce a un usuario con correo verificado', async () => {
        renderProvider();

        emitAuthState({
            uid: 'usuario-1',
            emailVerified: true,
        } as User);

        await waitFor(() => {
            expect(screen.getByTestId('auth-status'))
                .toHaveTextContent('authenticated');
        });

        expect(screen.getByTestId('auth-user'))
            .toHaveTextContent('usuario-1');

        expect(screen.getByTestId('is-authenticated'))
            .toHaveTextContent('true');
    });

    it('no autentica a un usuario cuyo correo no está verificado', async () => {
        renderProvider();

        emitAuthState({
            uid: 'usuario-2',
            emailVerified: false,
        } as User);

        await waitFor(() => {
            expect(screen.getByTestId('auth-status'))
                .toHaveTextContent('email-unverified');
        });

        expect(screen.getByTestId('is-authenticated'))
            .toHaveTextContent('false');
    });

    it('clasifica los errores del observador como error', async () => {
        renderProvider();

        const callback = mocks.errorCallback as
            | ((error: Error) => void)
            | undefined;

        expect(callback).toBeDefined();

        act(() => {
            callback?.(new Error('Error de prueba'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('auth-status'))
                .toHaveTextContent('error');
        });

        expect(screen.getByTestId('is-authenticated'))
            .toHaveTextContent('false');
    });

    it('permite reintentar la inicialización después de un fallo', async () => {
        mocks.getAuth
            .mockImplementationOnce(() => {
                throw new Error('Fallo inicial');
            })
            .mockReturnValue(mocks.auth);

        renderProvider();

        await waitFor(() => {
            expect(screen.getByTestId('auth-status'))
                .toHaveTextContent('error');
        });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Reintentar inicialización',
            }),
        );

        await waitFor(() => {
            expect(mocks.onAuthStateChanged)
                .toHaveBeenCalledTimes(1);
            expect(screen.getByTestId('auth-status'))
                .toHaveTextContent('loading');
        });

        emitAuthState(null);

        await waitFor(() => {
            expect(screen.getByTestId('auth-status'))
                .toHaveTextContent('unauthenticated');
        });
    });

    it('cierra la sesión mediante el servicio real', async () => {
        renderProvider();

        emitAuthState({
            uid: 'usuario-1',
            emailVerified: true,
        } as User);

        await waitFor(() => {
            expect(screen.getByTestId('auth-status'))
                .toHaveTextContent('authenticated');
        });

        await act(async () => {
            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Cerrar sesión de prueba',
                }),
            );
        });

        expect(mocks.logout).toHaveBeenCalledTimes(1);

        expect(screen.getByTestId('auth-status'))
            .toHaveTextContent('unauthenticated');
    });

    it('cancela la suscripción al desmontarse', () => {
        const { unmount } = renderProvider();

        unmount();

        expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
    });
});