import {
    useState,
    type ReactNode,
} from 'react';
import {
    AuthContext,
    type AuthStatus,
} from './AuthContext';

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    // La simulación comienza sin sesión y no necesita inicialización asíncrona.
    const [status, setStatus] = useState<AuthStatus>('unauthenticated');

    const login = () => {
        setStatus('authenticated');
    };

    const logout = () => {
        setStatus('unauthenticated');
    };

    const value = {
        status,
        isAuthenticated: status === 'authenticated',
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
