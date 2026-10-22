import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';

import { MemoryRouter } from 'react-router-dom';

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import ProfilePage from '../src/pages/profile/ProfilePage';

const mocks = vi.hoisted(() => ({
    updateName: vi.fn(),
    changePassword: vi.fn(),
    refreshUser: vi.fn(),
    getContact: vi.fn(),
    saveContact: vi.fn(),
}));

vi.mock('../src/context/AuthContext', () => ({
    useAuth: () => ({
        status: 'authenticated',
        user: {
            uid: 'test-user',
            displayName: 'Mauricio Lopez',
            email: 'mauricio@example.com',
            emailVerified: true,
        },
        refreshUser: mocks.refreshUser,
    }),
}));

vi.mock(
    '../src/services/authService',
    async (importOriginal) => {
        const original =
            await importOriginal<
                typeof import('../src/services/authService')
            >();

        return {
            ...original,
            updateAccountDisplayName: mocks.updateName,
            changeAccountPassword: mocks.changePassword,
        };
    },
);

vi.mock(
    '../src/services/firestoreProfileService',
    () => ({
        EMPTY_PROFILE_CONTACT: {
            phone: '',
            address: '',
        },
        getProfileContact: mocks.getContact,
        saveProfileContact: mocks.saveContact,
    }),
);

function renderProfile() {
    return render(
        <MemoryRouter>
            <ProfilePage />
        </MemoryRouter>,
    );
}

/*
 * Espera a que se complete la carga asíncrona
 * de los datos de contacto.
 *
 * findByLabelText utiliza las esperas
 * de Testing Library y permite que React
 * procese los cambios de estado del efecto.
 */
async function renderLoadedProfile() {
    renderProfile();

    await screen.findByLabelText(
        'Teléfono (opcional)',
    );
}

function enterPassword(
    label: string,
    value: string,
) {
    fireEvent.change(
        screen.getByLabelText(label),
        {
            target: { value },
        },
    );
}

beforeEach(() => {
    vi.clearAllMocks();

    mocks.updateName.mockResolvedValue(undefined);
    mocks.changePassword.mockResolvedValue(undefined);
    mocks.refreshUser.mockResolvedValue(undefined);

    mocks.getContact.mockResolvedValue({
        phone: '',
        address: '',
    });

    mocks.saveContact.mockImplementation(
        async (
            _uid: string,
            values: {
                phone: string;
                address: string;
            },
        ) => values,
    );
});

afterEach(() => {
    cleanup();
});

describe('Perfil de MateCode', () => {
    it(
        'muestra nombre, correo y estado de verificación',
        async () => {
            await renderLoadedProfile();

            expect(
                screen.getByRole('heading', {
                    name: 'Mi perfil',
                }),
            ).toBeInTheDocument();

            expect(
                screen.getByLabelText('Nombre completo'),
            ).toHaveValue('Mauricio Lopez');

            expect(
                screen.getByText(
                    'mauricio@example.com',
                ),
            ).toBeInTheDocument();

            expect(
                screen.getByText('Correo verificado'),
            ).toBeInTheDocument();
        },
    );

    it(
        'actualiza el nombre y solicita refrescar la sesión',
        async () => {
            await renderLoadedProfile();

            fireEvent.change(
                screen.getByLabelText('Nombre completo'),
                {
                    target: { value: 'Mauricio Pérez' },
                },
            );

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Guardar nombre',
                }),
            );

            await waitFor(() => {
                expect(
                    mocks.updateName,
                ).toHaveBeenCalledWith('Mauricio Pérez');
            });

            expect(
                mocks.refreshUser,
            ).toHaveBeenCalledTimes(1);

            expect(
                await screen.findByText(
                    'El nombre se actualizó correctamente.',
                ),
            ).toBeInTheDocument();
        },
    );

    it(
        'rechaza nombres demasiado cortos',
        async () => {
            await renderLoadedProfile();

            fireEvent.change(
                screen.getByLabelText('Nombre completo'),
                {
                    target: { value: 'A' },
                },
            );

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Guardar nombre',
                }),
            );

            expect(
                screen.getByRole('alert'),
            ).toHaveTextContent(
                'El nombre debe tener entre 2 y 80 caracteres.',
            );

            expect(
                mocks.updateName,
            ).not.toHaveBeenCalled();
        },
    );

    it(
        'permite mostrar y ocultar la contraseña actual',
        async () => {
            await renderLoadedProfile();

            const input = screen.getByLabelText(
                'Contraseña actual',
            );

            expect(input).toHaveAttribute(
                'type',
                'password',
            );

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Mostrar contraseña actual',
                }),
            );

            expect(input).toHaveAttribute(
                'type',
                'text',
            );

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Ocultar contraseña actual',
                }),
            );

            expect(input).toHaveAttribute(
                'type',
                'password',
            );
        },
    );

    it(
        'rechaza contraseñas cuya confirmación no coincide',
        async () => {
            await renderLoadedProfile();

            enterPassword(
                'Contraseña actual',
                'Actual123!',
            );

            enterPassword(
                'Nueva contraseña',
                'Nueva123!',
            );

            enterPassword(
                'Confirmar nueva contraseña',
                'Diferente123!',
            );

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Cambiar contraseña',
                }),
            );

            expect(
                screen.getByRole('alert'),
            ).toHaveTextContent(
                'La nueva contraseña y su confirmación no coinciden.',
            );

            expect(
                mocks.changePassword,
            ).not.toHaveBeenCalled();
        },
    );

    it(
        'cambia la contraseña y limpia los campos',
        async () => {
            await renderLoadedProfile();

            enterPassword(
                'Contraseña actual',
                'Actual123!',
            );

            enterPassword(
                'Nueva contraseña',
                'Nueva123!',
            );

            enterPassword(
                'Confirmar nueva contraseña',
                'Nueva123!',
            );

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Cambiar contraseña',
                }),
            );

            await waitFor(() => {
                expect(
                    mocks.changePassword,
                ).toHaveBeenCalledWith(
                    'Actual123!',
                    'Nueva123!',
                );
            });

            expect(
                await screen.findByText(
                    'La contraseña se cambió correctamente.',
                ),
            ).toBeInTheDocument();

            expect(
                screen.getByLabelText(
                    'Contraseña actual',
                ),
            ).toHaveValue('');

            expect(
                screen.getByLabelText(
                    'Nueva contraseña',
                ),
            ).toHaveValue('');

            expect(
                screen.getByLabelText(
                    'Confirmar nueva contraseña',
                ),
            ).toHaveValue('');
        },
    );

    it('muestra los datos guardados en un resumen, sin formulario', async () => {
        mocks.getContact.mockResolvedValue({
            phone: '+52 33 1234 5678',
            address: 'Calle 10',
        });
        renderProfile();

        expect(await screen.findByText('+52 33 1234 5678')).toBeInTheDocument();
        expect(screen.getByText('Calle 10')).toBeInTheDocument();
        expect(screen.getByRole('button', {
            name: 'Editar datos de contacto',
        })).toBeInTheDocument();
        expect(screen.queryByLabelText('Teléfono (opcional)')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Dirección (opcional)')).not.toBeInTheDocument();
        expect(mocks.getContact).toHaveBeenCalledWith('test-user');
    })

    it('guarda datos nuevos y pasa automáticamente a la vista resumen', async () => {
        await renderLoadedProfile();

        fireEvent.change(screen.getByLabelText('Teléfono (opcional)'), {
            target: { value: '+52 33 1234 5678' },
        });
        fireEvent.change(screen.getByLabelText('Dirección (opcional)'), {
            target: { value: 'Calle 10' },
        });
        fireEvent.click(screen.getByRole('button', {
            name: 'Guardar datos de contacto',
        }));

        await waitFor(() => {
            expect(mocks.saveContact).toHaveBeenCalledWith('test-user', {
                phone: '+52 33 1234 5678',
                address: 'Calle 10',
            });
        });
        expect(await screen.findByText('Calle 10')).toBeInTheDocument();
        expect(screen.getByText('+52 33 1234 5678')).toBeInTheDocument();
        expect(screen.queryByLabelText('Teléfono (opcional)')).not.toBeInTheDocument();
        expect(screen.getByRole('button', {
            name: 'Editar datos de contacto',
        })).toBeInTheDocument();
        expect(screen.getByText(
            'Tus datos de contacto se guardaron correctamente.',
        )).toBeInTheDocument();
    })

    it(
        'no confirma un guardado cuando Firestore falla',
        async () => {
            mocks.saveContact.mockRejectedValue(
                new Error('Permiso denegado'),
            );

            await renderLoadedProfile();

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Guardar datos de contacto',
                }),
            );

            expect(
                await screen.findByRole('alert'),
            ).toHaveTextContent(
                'Permiso denegado',
            );

            expect(
                screen.queryByText(
                    'Tus datos de contacto se guardaron correctamente.',
                ),
            ).not.toBeInTheDocument();
        },
    );

    it('permite reintentar una carga fallida y presenta el resumen', async () => {
        mocks.getContact
            .mockRejectedValueOnce(new Error('Sin conexión'))
            .mockResolvedValueOnce({ phone: '', address: 'Calle nueva' });
        renderProfile();

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'No se pudieron cargar los datos de contacto',
        );
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga' }));

        expect(await screen.findByText('Calle nueva')).toBeInTheDocument();
        expect(screen.getByText('No registrado')).toBeInTheDocument();
        expect(screen.queryByLabelText('Dirección (opcional)')).not.toBeInTheDocument();
        expect(mocks.getContact).toHaveBeenCalledTimes(2);
    })


    it('Editar precarga ambos campos y Cancelar descarta el borrador', async () => {
        mocks.getContact.mockResolvedValue({
            phone: '5551234567',
            address: 'Dirección anterior',
        });
        renderProfile();
        await screen.findByText('Dirección anterior');
        fireEvent.click(screen.getByRole('button', {
            name: 'Editar datos de contacto',
        }));

        const phoneInput = screen.getByLabelText('Teléfono (opcional)');
        expect(phoneInput).toHaveValue('5551234567');
        expect(screen.getByLabelText('Dirección (opcional)'))
            .toHaveValue('Dirección anterior');

        fireEvent.change(phoneInput, { target: { value: '1111111' } });
        fireEvent.change(screen.getByLabelText('Dirección (opcional)'), {
            target: { value: 'Dirección no guardada' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.getByText('5551234567')).toBeInTheDocument();
        expect(screen.getByText('Dirección anterior')).toBeInTheDocument();
        expect(screen.queryByText('Dirección no guardada')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Teléfono (opcional)')).not.toBeInTheDocument();
        expect(mocks.saveContact).not.toHaveBeenCalled();

        // Al reabrir, los inputs vuelven a los valores confirmados.
        fireEvent.click(screen.getByRole('button', {
            name: 'Editar datos de contacto',
        }));
        expect(screen.getByLabelText('Teléfono (opcional)'))
            .toHaveValue('5551234567');
    });

    it('Editar y Guardar cambios actualizan el resumen solo tras el éxito', async () => {
        mocks.getContact.mockResolvedValue({
            phone: '5551234567',
            address: 'Dirección anterior',
        });
        renderProfile();
        await screen.findByText('Dirección anterior');
        fireEvent.click(screen.getByRole('button', {
            name: 'Editar datos de contacto',
        }));
        fireEvent.change(screen.getByLabelText('Dirección (opcional)'), {
            target: { value: 'Dirección nueva' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

        await waitFor(() => {
            expect(mocks.saveContact).toHaveBeenCalledWith('test-user', {
                phone: '5551234567',
                address: 'Dirección nueva',
            });
        });
        expect(await screen.findByText('Dirección nueva')).toBeInTheDocument();
        expect(screen.queryByText('Dirección anterior')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Dirección (opcional)')).not.toBeInTheDocument();
    });

    it('si falla una edición conserva el formulario y no altera el resumen', async () => {
        mocks.getContact.mockResolvedValue({
            phone: '5551234567',
            address: 'Dirección segura',
        });
        mocks.saveContact.mockRejectedValue(new Error('Permiso denegado'));
        renderProfile();
        await screen.findByText('Dirección segura');
        fireEvent.click(screen.getByRole('button', {
            name: 'Editar datos de contacto',
        }));
        fireEvent.change(screen.getByLabelText('Dirección (opcional)'), {
            target: { value: 'Cambio no persistido' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Permiso denegado');
        expect(screen.getByLabelText('Dirección (opcional)'))
            .toHaveValue('Cambio no persistido');
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        expect(screen.getByText('Dirección segura')).toBeInTheDocument();
        expect(screen.queryByText('Cambio no persistido')).not.toBeInTheDocument();
    });

    it('los datos vacíos muestran directamente el formulario', async () => {
        await renderLoadedProfile();
        expect(screen.getByRole('button', {
            name: 'Guardar datos de contacto',
        })).toBeInTheDocument();
        expect(screen.queryByRole('button', {
            name: 'Editar datos de contacto',
        })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Cancelar' }))
            .not.toBeInTheDocument();
    });

    it('al volver a montar el perfil vuelve a cargar datos y muestra resumen', async () => {
        const values = { phone: '5551234567', address: 'Calle persistida' };
        mocks.getContact.mockResolvedValue(values);
        const view = renderProfile();
        await screen.findByText('Calle persistida');
        view.unmount();

        renderProfile();
        expect(await screen.findByText('Calle persistida')).toBeInTheDocument();
        expect(mocks.getContact).toHaveBeenCalledTimes(2);
    });

});
