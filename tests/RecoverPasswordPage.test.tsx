import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import {
    AuthServiceError,
    sendPasswordReset,
} from '../src/services/authService';
import RecoverPasswordPage from '../src/pages/auth/RecoverPasswordPage';

vi.mock('../src/services/authService', () => {
    class MockAuthServiceError extends Error { }

    return {
        AuthServiceError: MockAuthServiceError,
        sendPasswordReset: vi.fn(),
    };
});

const mockedSendPasswordReset = vi.mocked(sendPasswordReset);

function renderRecoverPasswordPage() {
    return render(
        <MemoryRouter>
            <RecoverPasswordPage />
        </MemoryRouter>,
    );
}

describe('RecoverPasswordPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedSendPasswordReset.mockResolvedValue(undefined);
    });

    it('muestra el formulario de recuperación de contraseña', () => {
        renderRecoverPasswordPage();

        expect(
            screen.getByRole('heading', {
                name: 'Recuperar contraseña',
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('textbox', {
                name: 'Correo electrónico',
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'Enviar instrucciones',
            }),
        ).toBeInTheDocument();
    });

    it('envía la solicitud y muestra un mensaje neutral', async () => {
        renderRecoverPasswordPage();

        fireEvent.change(
            screen.getByRole('textbox', {
                name: 'Correo electrónico',
            }),
            {
                target: { value: 'ana@example.com' },
            },
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Enviar instrucciones',
            }),
        );

        await waitFor(() => {
            expect(mockedSendPasswordReset).toHaveBeenCalledWith(
                'ana@example.com',
            );
        });

        expect(
            await screen.findByRole('status'),
        ).toHaveTextContent(
            'Si existe una cuenta asociada a ese correo, recibirás instrucciones',
        );
    });

    it('no revela si la dirección de correo tiene una cuenta registrada', async () => {
        renderRecoverPasswordPage();

        fireEvent.change(
            screen.getByRole('textbox', {
                name: 'Correo electrónico',
            }),
            {
                target: { value: 'desconocido@example.com' },
            },
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Enviar instrucciones',
            }),
        );

        expect(
            await screen.findByRole('status'),
        ).toHaveTextContent(
            'Si existe una cuenta asociada a ese correo',
        );

        expect(
            screen.queryByText(/no existe una cuenta/i),
        ).not.toBeInTheDocument();
    });

    it('muestra un mensaje genérico ante un error inesperado', async () => {
        mockedSendPasswordReset.mockRejectedValue(
            new Error('Internal error'),
        );

        renderRecoverPasswordPage();

        fireEvent.change(
            screen.getByRole('textbox', {
                name: 'Correo electrónico',
            }),
            {
                target: { value: 'ana@example.com' },
            },
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Enviar instrucciones',
            }),
        );

        expect(
            await screen.findByRole('alert'),
        ).toHaveTextContent(
            'No se pudo procesar la solicitud. Inténtalo nuevamente más tarde.',
        );

        expect(
            screen.queryByText('Internal error'),
        ).not.toBeInTheDocument();
    });

    it('muestra el mensaje seguro de un error conocido del servicio', async () => {
        mockedSendPasswordReset.mockRejectedValue(
            new AuthServiceError(
                'No se pudo enviar el correo. Inténtalo nuevamente.',
            ),
        );

        renderRecoverPasswordPage();

        fireEvent.change(
            screen.getByRole('textbox', {
                name: 'Correo electrónico',
            }),
            {
                target: { value: 'ana@example.com' },
            },
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Enviar instrucciones',
            }),
        );

        expect(
            await screen.findByRole('alert'),
        ).toHaveTextContent(
            'No se pudo enviar el correo. Inténtalo nuevamente.',
        );
    });

    it('deshabilita el formulario mientras procesa la solicitud', async () => {
        let resolveRequest!: () => void;

        mockedSendPasswordReset.mockReturnValue(
            new Promise<void>((resolve) => {
                resolveRequest = resolve;
            }),
        );

        renderRecoverPasswordPage();

        const emailInput = screen.getByRole('textbox', {
            name: 'Correo electrónico',
        });

        fireEvent.change(emailInput, {
            target: { value: 'ana@example.com' },
        });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Enviar instrucciones',
            }),
        );

        expect(
            screen.getByRole('button', {
                name: 'Procesando solicitud...',
            }),
        ).toBeDisabled();

        expect(emailInput).toBeDisabled();
        expect(mockedSendPasswordReset).toHaveBeenCalledTimes(1);

        resolveRequest();

        expect(
            await screen.findByRole('status'),
        ).toHaveTextContent(
            'Si existe una cuenta asociada a ese correo',
        );
    });

    it('incluye un enlace para volver a iniciar sesión', () => {
        renderRecoverPasswordPage();

        expect(
            screen.getByRole('link', {
                name: 'Volver a iniciar sesión',
            }),
        ).toHaveAttribute('href', '/iniciar-sesion');
    });
});
