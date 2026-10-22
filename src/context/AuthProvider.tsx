import {
    useCallback,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import {
    getAuth,
    onAuthStateChanged,
    type User,
} from 'firebase/auth';

import { getFirebaseApp } from '../lib/firebase';

import {
    login as loginService,
    logout as logoutService,
    reloadCurrentUser,
    sendVerificationEmail as sendVerificationEmailService,
} from '../services/authService';

import {
    AuthContext,
    type AuthStatus,
} from './AuthContext';

interface AuthProviderProps {
    children: ReactNode;
}

function toError(value: unknown): Error {
    if (value instanceof Error) {
        return value;
    }

    return new Error(
        'No se pudo inicializar la autenticación de Firebase.',
    );
}

function getUserStatus(
    user: User | null,
): AuthStatus {
    if (!user) {
        return 'unauthenticated';
    }

    return user.emailVerified
        ? 'authenticated'
        : 'email-unverified';
}

export function AuthProvider({
    children,
}: AuthProviderProps) {
    const [status, setStatus] =
        useState<AuthStatus>('loading');

    const [user, setUser] =
        useState<User | null>(null);

    const [error, setError] =
        useState<Error | null>(null);

    const [retryCount, setRetryCount] =
        useState(0);

    /*
     * Bloque 4B.
     *
     * Firebase puede actualizar el mismo objeto
     * User después de updateProfile o reload.
     *
     * Esta revisión fuerza una nueva publicación
     * del contexto sin alterar el tipo User.
     */
    const [, setProfileRevision] = useState(0);

    useEffect(() => {
        let active = true;

        let unsubscribe:
            | (() => void)
            | undefined;

        try {
            const auth = getAuth(getFirebaseApp());

            unsubscribe = onAuthStateChanged(
                auth,
                (firebaseUser) => {
                    if (!active) {
                        return;
                    }

                    setUser(firebaseUser);
                    setStatus(
                        getUserStatus(firebaseUser),
                    );
                    setError(null);
                },
                (cause) => {
                    console.error(
                        '[MateCode Auth] Error en onAuthStateChanged:',
                        cause,
                    );

                    if (!active) {
                        return;
                    }

                    setUser(null);
                    setStatus('error');
                    setError(toError(cause));
                },
            );
        } catch (cause) {
            console.error(
                '[MateCode Auth] Error al inicializar Firebase:',
                cause,
            );

            if (active) {
                queueMicrotask(() => {
                    if (!active) {
                        return;
                    }

                    setUser(null);
                    setStatus('error');
                    setError(toError(cause));
                });
            }
        }

        return () => {
            active = false;
            unsubscribe?.();
        };
    }, [retryCount]);

    const login = useCallback(
        async (
            email: string,
            password: string,
        ) => {
            const credential = await loginService(
                email,
                password,
            );

            const authenticatedUser =
                credential.user;

            setUser(authenticatedUser);

            setStatus(
                getUserStatus(authenticatedUser),
            );

            setError(null);

            return credential;
        },
        [],
    );

    const logout = useCallback(
        async () => {
            await logoutService();

            setUser(null);
            setStatus('unauthenticated');
            setError(null);
        },
        [],
    );

    const sendVerificationEmail = useCallback(
        async () => {
            const auth = getAuth(getFirebaseApp());
            const currentUser = auth.currentUser;

            if (!currentUser) {
                throw new Error(
                    'Debes iniciar sesión para solicitar la verificación del correo.',
                );
            }

            if (currentUser.emailVerified) {
                throw new Error(
                    'Tu correo ya está verificado.',
                );
            }

            await sendVerificationEmailService(
                currentUser,
            );
        },
        [],
    );

    const refreshUser = useCallback(
        async () => {
            const auth = getAuth(getFirebaseApp());
            const currentUser = auth.currentUser;

            if (!currentUser) {
                setUser(null);
                setStatus('unauthenticated');
                setError(null);
                return;
            }

            try {
                await reloadCurrentUser(currentUser);

                setUser(currentUser);

                setStatus(
                    getUserStatus(currentUser),
                );

                setError(null);

                /*
                 * Publica el nombre y los datos nuevos
                 * incluso si la referencia User no cambia.
                 */
                setProfileRevision(
                    (current) => current + 1,
                );
            } catch (cause) {
                throw toError(cause);
            }
        },
        [],
    );

    const retryInitialization = useCallback(
        () => {
            setStatus('loading');
            setUser(null);
            setError(null);

            setRetryCount(
                (current) => current + 1,
            );
        },
        [],
    );

    const value = {
        status,
        user,
        error,
        isAuthenticated:
            status === 'authenticated',
        login,
        logout,
        sendVerificationEmail,
        refreshUser,
        retryInitialization,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
