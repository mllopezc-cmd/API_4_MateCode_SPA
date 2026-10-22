import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthServiceError } from '../src/services/authService';
import RegisterPage from '../src/pages/auth/RegisterPage';

const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    register: vi.fn(),
    getPasswordValidationError: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();

    return {
        ...actual,
        useNavigate: () => mocks.navigate,
    };

});

vi.mock('../src/services/authService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../src/services/authService')>();

    return {
        ...actual,
        register: mocks.register,
        getPasswordValidationError: mocks.getPasswordValidationError,
    };

});

function renderRegisterPage() {
    return render(
        <MemoryRouter initialEntries={['/crear-cuenta']}>
            <Routes>
                <Route path="/crear-cuenta" element={<RegisterPage />} />
                <Route path="/verificar-correo" element={<p>Verificación de correo</p>} />
            </Routes>
        </MemoryRouter>,
    );
}

function fillValidForm() {
    fireEvent.change(screen.getByLabelText('Nombre'), {
        target: { value: 'Ana Pérez' },
    });

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
        target: { value: 'ana@example.com' },
    });

    fireEvent.change(screen.getByLabelText('Contraseña'), {
        target: { value: 'Password123!' },
    });

    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'Password123!' },
    });
}

describe('RegisterPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.register.mockResolvedValue({});
        mocks.getPasswordValidationError.mockReturnValue(null);
    });

    it('muestra el formulario y los requisitos de contraseña', () => {
        renderRegisterPage();

        expect(
            screen.getByRole('heading', { name: 'Crear cuenta' }),
        ).toBeInTheDocument();

        expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
        expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
        expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
        expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();

        expect(screen.getByText('Mínimo 8 caracteres.')).toBeInTheDocument();
        expect(
            screen.getByText(/letra mayúscula y una minúscula/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/Al menos un número/i)).toBeInTheDocument();
        expect(screen.getByText(/símbolo especial/i)).toBeInTheDocument();
    });

    it('no registra la cuenta cuando el nombre está vacío', async () => {
        renderRegisterPage();

        fillValidForm();

        fireEvent.change(screen.getByLabelText('Nombre'), {
            target: { value: '   ' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Ingresa tu nombre para continuar.',
        );

        expect(mocks.register).not.toHaveBeenCalled();
    });

    it('muestra el error de validación de contraseña y no registra la cuenta', async () => {
        mocks.getPasswordValidationError.mockReturnValue(
            'La contraseña debe incluir al menos un símbolo especial.',
        );

        renderRegisterPage();
        fillValidForm();

        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'La contraseña debe incluir al menos un símbolo especial.',
        );

        expect(mocks.register).not.toHaveBeenCalled();
    });

    it('rechaza contraseñas que no coinciden', async () => {
        renderRegisterPage();
        fillValidForm();

        fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
            target: { value: 'Different123!' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Las contraseñas no coinciden.',
        );

        expect(mocks.register).not.toHaveBeenCalled();
    });

    it('registra la cuenta y navega a la verificación del correo', async () => {
        renderRegisterPage();
        fillValidForm();

        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        await waitFor(() => {
            expect(mocks.register).toHaveBeenCalledWith(
                'ana@example.com',
                'Password123!',
                'Ana Pérez',
            );
        });

        expect(mocks.navigate).toHaveBeenCalledWith('/verificar-correo', {
            replace: true,
            state: { email: 'ana@example.com' },
        });
    });

    it('navega a verificación si la cuenta se creó pero falló un paso posterior', async () => {
        mocks.register.mockRejectedValue(
            new AuthServiceError(
                'La cuenta se creó, pero no se pudo completar la configuración.',
                'auth/network-request-failed',
                true,
            ),
        );

        renderRegisterPage();
        fillValidForm();

        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalledWith('/verificar-correo', {
                replace: true,
                state: {
                    email: 'ana@example.com',
                    notice: 'La cuenta se creó, pero no se pudo completar la configuración.',
                },
            });
        });
    });

    it('muestra el error cuando falla el registro', async () => {
        mocks.register.mockRejectedValue(
            new AuthServiceError(
                'Ya existe una cuenta con ese correo electrónico.',
                'auth/email-already-in-use',
            ),
        );

        renderRegisterPage();
        fillValidForm();

        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Ya existe una cuenta con ese correo electrónico.',
        );

        expect(mocks.navigate).not.toHaveBeenCalled();
    });

    it('deshabilita el botón mientras se crea la cuenta', async () => {
        let resolveRegistration!: (value: unknown) => void;

        mocks.register.mockReturnValue(
            new Promise((resolve) => {
                resolveRegistration = resolve;
            }),
        );

        renderRegisterPage();
        fillValidForm();

        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        expect(
            screen.getByRole('button', { name: 'Creando cuenta...' }),
        ).toBeDisabled();

        expect(screen.getByLabelText('Nombre')).toBeDisabled();

        resolveRegistration({});

        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalled();
        });
    });
});