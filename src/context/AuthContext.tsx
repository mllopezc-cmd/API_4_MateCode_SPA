import { createContext, useContext } from 'react';
import type { User, UserCredential } from 'firebase/auth';

export type AuthStatus =
    | 'loading'
    | 'unauthenticated'
    | 'email-unverified'
    | 'authenticated'
    | 'error';

export interface AuthContextType {
    status: AuthStatus;
    user: User | null;
    error: Error | null;
    isAuthenticated: boolean;
    login: (
        email: string,
        password: string,
    ) => Promise<UserCredential>;
    logout: () => Promise<void>;
    sendVerificationEmail: () => Promise<void>;
    refreshUser: () => Promise<void>;
    retryInitialization: () => void;
}

export const AuthContext = createContext<
    AuthContextType | undefined
>(undefined);

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error(
            'useAuth debe utilizarse dentro de AuthProvider',
        );
    }

    return context;
}