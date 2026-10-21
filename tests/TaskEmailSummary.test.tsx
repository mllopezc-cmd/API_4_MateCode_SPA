import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';

const mocks = vi.hoisted(() => ({
    requestTaskSummary: vi.fn(),
}));

vi.mock('../src/services/taskEmailService', () => ({
    requestTaskSummary: mocks.requestTaskSummary,
}));

import {
    TaskEmailSummary,
} from '../src/components/TaskEmailSummary';

const user = {
    getIdToken: vi.fn(),
};

describe('Botón de resumen por correo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('muestra el resultado de una solicitud', async () => {
        mocks.requestTaskSummary.mockResolvedValue(
            'Resumen generado en modo de prueba.',
        );

        render(<TaskEmailSummary user={user} />);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Enviar resumen',
            }),
        );

        expect(
            await screen.findByRole('status'),
        ).toHaveTextContent(
            'Resumen generado en modo de prueba.',
        );
    });

    it('evita solicitudes duplicadas mientras procesa', async () => {
        let finish: ((value: string) => void) | undefined;

        mocks.requestTaskSummary.mockImplementation(
            () => new Promise<string>((resolve) => {
                finish = resolve;
            }),
        );

        render(<TaskEmailSummary user={user} />);

        const button = screen.getByRole('button', {
            name: 'Enviar resumen',
        });

        fireEvent.click(button);

        expect(
            screen.getByRole('button', {
                name: 'Procesando solicitud...',
            }),
        ).toBeDisabled();

        expect(mocks.requestTaskSummary)
            .toHaveBeenCalledTimes(1);

        await act(async () => {
            finish?.('Solicitud completada.');
        });

        await waitFor(() => {
            expect(
                screen.getByRole('button', {
                    name: 'Enviar resumen',
                }),
            ).toBeEnabled();
        });
    });

    it('presenta errores sin comunicar éxito', async () => {
        mocks.requestTaskSummary.mockRejectedValue(
            new Error('Límite de envíos alcanzado.'),
        );

        render(<TaskEmailSummary user={user} />);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Enviar resumen',
            }),
        );

        expect(
            await screen.findByRole('alert'),
        ).toHaveTextContent(
            'Límite de envíos alcanzado.',
        );

        expect(
            screen.queryByRole('status'),
        ).not.toBeInTheDocument();
    });
});
