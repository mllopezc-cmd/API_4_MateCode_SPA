import { createContext, useContext } from 'react';

export type AuthStatus =
    | 'loading'
    | 'authenticated'
    | 'unauthenticated';

export interface AuthContextType {
    status: AuthStatus;
    isAuthenticated: boolean;
    login: () => void;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
    undefined,
);

export function useAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth debe utilizarse dentro de AuthProvider');
    }

    return context;
}
