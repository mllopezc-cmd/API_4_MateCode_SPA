import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User, UserCredential } from 'firebase/auth';

import {
    useAuth,
    type AuthContextType,
} from '../src/context/AuthContext';
import VerifyEmailPage from '../src/pages/auth/VerifyEmailPage';

vi.mock('../src/context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function createAuthValue(
    overrides: Partial<AuthContextType> = {},
): AuthContextType {
    const testUser = {
        email: 'ana@example.com',
        emailVerified: false,
    } as User;

    return {
        status: 'email-unverified',
        user: testUser,
        error: null,
        isAuthenticated: false,
        login: vi.fn().mockResolvedValue({
            user: testUser,
        } as UserCredential),
        logout: vi.fn().mockResolvedValue(undefined),
        sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
        refreshUser: vi.fn().mockResolvedValue(undefined),
        retryInitialization: vi.fn(),
        ...overrides,
    };
}

function renderVerifyPage(
    state: Record<string, unknown> = {},
) {
    return render(
        <MemoryRouter
            initialEntries={[
                {
                    pathname: '/verificar-correo',
                    state,
                },
            ]}
        >
            <Routes>
                <Route
                    path="/verificar-correo"
                    element={<VerifyEmailPage />}
                />
                <Route
                    path="/panel"
                    element={<div>Panel principal</div>}
                />
                <Route
                    path="/iniciar-sesion"
                    element={<div>Formulario de inicio de sesión</div>}
                />
            </Routes>
        </MemoryRouter>,
    );
}

describe('VerifyEmailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedUseAuth.mockReturnValue(createAuthValue());
    });

    it('muestra el estado de carga mientras se inicializa la autenticación', () => {
        mockedUseAuth.mockReturnValue(
            createAuthValue({
                status: 'loading',
                user: null,
            }),
        );

        renderVerifyPage();

        expect(
            screen.getByText(
                'Estamos comprobando el estado de tu sesión...',
            ),
        ).toBeInTheDocument();
    });

    it('muestra las instrucciones y el correo de la cuenta sin verificar', () => {
        renderVerifyPage({
            email: 'ana@example.com',
            notice: 'La cuenta se creó, pero no se pudo enviar el correo.',
        });

        expect(
            screen.getByRole('heading', {
                name: 'Verifica tu correo electrónico',
            }),
        ).toBeInTheDocument();

        expect(screen.getByText('ana@example.com')).toBeInTheDocument();

        expect(
            screen.getByRole('status', {
                name: '',
            }),
        ).toHaveTextContent(
            'La cuenta se creó, pero no se pudo enviar el correo.',
        );

        expect(
            screen.getByRole('button', {
                name: 'Ya verifiqué mi correo',
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'Reenviar correo de verificación',
            }),
        ).toBeInTheDocument();
    });

    it('comprueba manualmente el estado de la cuenta al pulsar que ya verificó el correo', async () => {
        const refreshUser = vi.fn().mockResolvedValue(undefined);

        mockedUseAuth.mockReturnValue(
            createAuthValue({ refreshUser }),
        );

        renderVerifyPage();

        // Espera a que se ejecute la comprobación automática inicial.
        await waitFor(() => {
            expect(refreshUser).toHaveBeenCalled();
        });

        // Aísla las llamadas producidas por la acción manual.
        refreshUser.mockClear();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Ya verifiqué mi correo',
            }),
        );

        await waitFor(() => {
            expect(refreshUser).toHaveBeenCalledTimes(1);
        });

        expect(
            await screen.findByText(
                /Comprobación completada\. Si tu correo ya está verificado/,
            ),
        ).toBeInTheDocument();
    });

    it('solicita un nuevo correo de verificación', async () => {
        const sendVerificationEmail = vi
            .fn()
            .mockResolvedValue(undefined);

        mockedUseAuth.mockReturnValue(
            createAuthValue({ sendVerificationEmail }),
        );

        renderVerifyPage();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Reenviar correo de verificación',
            }),
        );

        await waitFor(() => {
            expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
        });

        expect(
            await screen.findByText(
                /Hemos solicitado un nuevo correo de verificación/,
            ),
        ).toBeInTheDocument();
    });

    it('muestra un mensaje genérico si falla la comprobación de la verificación', async () => {
        const refreshUser = vi
            .fn()
            .mockRejectedValue(new Error('Internal error'));

        mockedUseAuth.mockReturnValue(
            createAuthValue({ refreshUser }),
        );

        renderVerifyPage();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Ya verifiqué mi correo',
            }),
        );

        expect(
            await screen.findByRole('alert'),
        ).toHaveTextContent(
            'No se pudo comprobar el estado de tu cuenta. Inténtalo nuevamente.',
        );

        expect(
            screen.queryByText('Internal error'),
        ).not.toBeInTheDocument();
    });

    it('muestra un mensaje genérico si falla el reenvío del correo', async () => {
        const sendVerificationEmail = vi
            .fn()
            .mockRejectedValue(new Error('Internal error'));

        mockedUseAuth.mockReturnValue(
            createAuthValue({ sendVerificationEmail }),
        );

        renderVerifyPage();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Reenviar correo de verificación',
            }),
        );

        expect(
            await screen.findByRole('alert'),
        ).toHaveTextContent(
            'No se pudo enviar el correo de verificación. Inténtalo nuevamente.',
        );

        expect(
            screen.queryByText('Internal error'),
        ).not.toBeInTheDocument();
    });

    it('deshabilita los botones mientras se reenvía el correo', async () => {
        let resolveRequest!: () => void;

        const pendingRequest = new Promise<void>((resolve) => {
            resolveRequest = resolve;
        });

        const sendVerificationEmail = vi.fn(
            () => pendingRequest,
        );

        mockedUseAuth.mockReturnValue(
            createAuthValue({ sendVerificationEmail }),
        );

        renderVerifyPage();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Reenviar correo de verificación',
            }),
        );

        expect(
            screen.getByRole('button', {
                name: 'Enviando...',
            }),
        ).toBeDisabled();

        expect(
            screen.getByRole('button', {
                name: 'Ya verifiqué mi correo',
            }),
        ).toBeDisabled();

        expect(sendVerificationEmail).toHaveBeenCalledTimes(1);

        resolveRequest();

        expect(
            await screen.findByText(
                /Hemos solicitado un nuevo correo de verificación/,
            ),
        ).toBeInTheDocument();
    });

    it('ofrece iniciar sesión cuando no hay una sesión activa', () => {
        mockedUseAuth.mockReturnValue(
            createAuthValue({
                status: 'unauthenticated',
                user: null,
            }),
        );

        renderVerifyPage({
            email: 'ana@example.com',
        });

        expect(
            screen.getByText(
                /No hay una sesión activa/,
            ),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('link', {
                name: 'Ir a iniciar sesión',
            }),
        ).toHaveAttribute('href', '/iniciar-sesion');

        expect(
            screen.queryByRole('button', {
                name: 'Reenviar correo de verificación',
            }),
        ).not.toBeInTheDocument();
    });

    it('redirige al panel cuando el correo ya está verificado', async () => {
        const verifiedUser = {
            email: 'ana@example.com',
            emailVerified: true,
        } as User;

        mockedUseAuth.mockReturnValue(
            createAuthValue({
                status: 'authenticated',
                user: verifiedUser,
                isAuthenticated: true,
            }),
        );

        renderVerifyPage();

        expect(
            await screen.findByText('Panel principal'),
        ).toBeInTheDocument();
    });

    it('muestra un mensaje seguro si falla la inicialización de autenticación', () => {
        mockedUseAuth.mockReturnValue(
            createAuthValue({
                status: 'error',
                user: null,
                error: new Error('Internal error'),
            }),
        );

        renderVerifyPage();

        expect(
            screen.getByRole('alert'),
        ).toHaveTextContent(
            'No se pudo comprobar el estado de la autenticación.',
        );

        expect(
            screen.queryByText('Internal error'),
        ).not.toBeInTheDocument();

        expect(
            screen.getByRole('link', {
                name: 'Ir a iniciar sesión',
            }),
        ).toHaveAttribute('href', '/iniciar-sesion');
    });
});
