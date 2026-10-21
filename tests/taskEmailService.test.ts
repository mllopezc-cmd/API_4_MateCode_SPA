// @vitest-environment node

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    requestTaskSummary,
} from '../src/services/taskEmailService';

const fetchMock = vi.fn();

const user = {
    getIdToken: vi.fn(),
};

describe('Servicio de resumen por correo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', fetchMock);

        user.getIdToken.mockResolvedValue(
            'firebase-test-token',
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('envía solamente el token de Firebase', async () => {
        fetchMock.mockResolvedValue(
            Response.json({
                ok: true,
                simulated: true,
                message: 'Resumen simulado.',
            }),
        );

        const result = await requestTaskSummary(user);

        expect(result).toBe('Resumen simulado.');

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/send-summary-tasks',
            {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer firebase-test-token',
                    Accept: 'application/json',
                },
                cache: 'no-store',
            },
        );
    });

    it('rechaza una sesión inválida', async () => {
        user.getIdToken.mockRejectedValue(
            new Error('Token no disponible'),
        );

        await expect(
            requestTaskSummary(user),
        ).rejects.toThrow(
            'No fue posible comprobar tu sesión.',
        );

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('interpreta los límites del servidor', async () => {
        fetchMock.mockResolvedValue(
            Response.json(
                {
                    ok: false,
                    message: 'Has alcanzado el límite de solicitudes.',
                },
                { status: 429 },
            ),
        );

        await expect(
            requestTaskSummary(user),
        ).rejects.toThrow(
            'Has alcanzado el límite de solicitudes.',
        );
    });

    it('rechaza respuestas que no sean JSON válido', async () => {
        fetchMock.mockResolvedValue(
            new Response('<html>Error</html>', {
                status: 200,
            }),
        );

        await expect(
            requestTaskSummary(user),
        ).rejects.toThrow(
            'El servicio de correo no está disponible',
        );
    });

    it('controla errores de conexión', async () => {
        fetchMock.mockRejectedValue(
            new Error('Network error'),
        );

        await expect(
            requestTaskSummary(user),
        ).rejects.toThrow(
            'El servicio de correo no está disponible',
        );
    });
});
