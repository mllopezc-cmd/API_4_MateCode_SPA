// @vitest-environment node

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
    getServerFirebaseApp: vi.fn(),
    verifyIdToken: vi.fn(),
    getUser: vi.fn(),
    getTasks: vi.fn(),
    documentId: vi.fn(),
    reserveSummaryEmailQuota: vi.fn(),
    sendTaskSummaryEmail: vi.fn(),
}));

vi.mock('../api/_firebaseAdmin', () => ({
    getServerFirebaseApp:
        mocks.getServerFirebaseApp,
}));

vi.mock('firebase-admin/auth', () => ({
    getAuth: () => ({
        verifyIdToken: mocks.verifyIdToken,
        getUser: mocks.getUser,
    }),
}));

vi.mock('firebase-admin/firestore', () => ({
    getFirestore: () => ({
        collection: (name: string) => {
            if (name !== 'users') {
                throw new Error('Colección no autorizada');
            }

            return {
                doc: (uid: string) => {
                    mocks.documentId(uid);

                    return {
                        collection: (taskCollection: string) => {
                            if (taskCollection !== 'tasks') {
                                throw new Error(
                                    'Colección no autorizada',
                                );
                            }

                            return {
                                get: mocks.getTasks,
                            };
                        },
                    };
                },
            };
        },
    }),
}));

vi.mock('../api/_emailRateLimit', () => ({
    reserveSummaryEmailQuota:
        mocks.reserveSummaryEmailQuota,
}));

vi.mock('../api/_sesEmailSender', () => ({
    sendTaskSummaryEmail:
        mocks.sendTaskSummaryEmail,
}));

import handler from '../api/send-summary-tasks';
import { buildTaskSummaryEmail } from '../api/_taskEmailContent';

function makeRequest(
    method = 'POST',
    authorization?: string,
): Request {
    return new Request(
        'http://localhost/api/send-summary-tasks',
        {
            method,
            headers: authorization
                ? { Authorization: authorization }
                : {},
        },
    );
}

describe('API segura de resumen de tareas', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'disabled');
        vi.stubEnv(
            'AWS_SES_FROM_EMAIL',
            'usuario@example.com',
        );

        mocks.reserveSummaryEmailQuota.mockResolvedValue({
            allowed: true,
        });

        mocks.sendTaskSummaryEmail.mockResolvedValue({
            status: 'accepted',
            messageId: 'ses-test-message-id',
        });

        mocks.getServerFirebaseApp.mockReturnValue({
            name: 'test-server',
        });

        mocks.verifyIdToken.mockResolvedValue({
            uid: 'usuario-a',
        });

        mocks.getUser.mockResolvedValue({
            uid: 'usuario-a',
            email: 'usuario@example.com',
            emailVerified: true,
            disabled: false,
        });

        mocks.getTasks.mockResolvedValue({
            size: 3,
            docs: [
                {
                    data: () => ({
                        title: 'Preparar informe',
                        description: 'Revisar las actividades',
                        status: 'pendiente',
                    }),
                },
                {
                    data: () => ({
                        title: 'Desarrollar proyecto',
                        description: 'Completar los módulos',
                        status: 'en_progreso',
                    }),
                },
                {
                    data: () => ({
                        title: 'Revisar documentación',
                        description: '',
                        status: 'completada',
                    }),
                },
            ],
        });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('rechaza métodos diferentes de POST', async () => {
        const response = await handler.fetch(
            makeRequest('GET'),
        );

        expect(response.status).toBe(405);
        expect(mocks.getTasks).not.toHaveBeenCalled();
    });

    it('rechaza solicitudes sin token', async () => {
        const response = await handler.fetch(
            makeRequest(),
        );

        expect(response.status).toBe(401);
        expect(mocks.getTasks).not.toHaveBeenCalled();
    });

    it('rechaza tokens inválidos', async () => {
        mocks.verifyIdToken.mockRejectedValue(
            new Error('Token inválido'),
        );

        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-invalido'),
        );

        expect(response.status).toBe(401);
        expect(mocks.getTasks).not.toHaveBeenCalled();
    });

    it('rechaza usuarios sin correo verificado', async () => {
        mocks.getUser.mockResolvedValue({
            uid: 'usuario-a',
            email: 'usuario@example.com',
            emailVerified: false,
            disabled: false,
        });

        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-valido'),
        );

        expect(response.status).toBe(403);
        expect(mocks.getTasks).not.toHaveBeenCalled();
    });

    it('consulta solamente las tareas del UID autenticado', async () => {
        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-valido'),
        );

        expect(response.status).toBe(200);
        expect(mocks.documentId).toHaveBeenCalledWith(
            'usuario-a',
        );
        expect(mocks.documentId).toHaveBeenCalledTimes(1);

        const data = await response.json();

        expect(data.simulated).toBe(true);
        expect(data.summary).toEqual({
            total: 3,
            pendientes: 1,
            enProgreso: 1,
            completadas: 1,
        });
    });

    it('no consulta Firestore si falta configuración del servidor', async () => {
        mocks.getServerFirebaseApp.mockImplementation(() => {
            throw new Error('Configuración inexistente');
        });

        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-valido'),
        );

        expect(response.status).toBe(503);
        expect(mocks.getTasks).not.toHaveBeenCalled();
    });


    it('no consume cuota ni envía correos en modo simulado', async () => {
        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-valido'),
        );

        expect(response.status).toBe(200);
        expect(mocks.reserveSummaryEmailQuota)
            .not.toHaveBeenCalled();
        expect(mocks.sendTaskSummaryEmail)
            .not.toHaveBeenCalled();

        const body = await response.json();
        expect(body.simulated).toBe(true);
    });

    it('reserva cuota y solicita el envío al correo autenticado', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');

        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-valido'),
        );

        expect(response.status).toBe(200);

        expect(mocks.reserveSummaryEmailQuota)
            .toHaveBeenCalledWith(
                expect.anything(),
                'usuario-a',
            );

        expect(mocks.sendTaskSummaryEmail)
            .toHaveBeenCalledWith(
                'usuario@example.com',
                expect.objectContaining({
                    subject: 'MateCode | Resumen de tus tareas',
                    html: expect.any(String),
                    text: expect.any(String),
                }),
            );

        const body = await response.json();
        expect(body.simulated).toBe(false);
    });

    it('devuelve 429 cuando se agotó la cuota', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');

        mocks.reserveSummaryEmailQuota.mockResolvedValue({
            allowed: false,
            retryAfterSeconds: 540,
        });

        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-valido'),
        );

        expect(response.status).toBe(429);
        expect(response.headers.get('Retry-After'))
            .toBe('540');

        const body = await response.json();
        expect(body.retryAfterSeconds).toBe(540);

        expect(mocks.sendTaskSummaryEmail)
            .not.toHaveBeenCalled();
    });

    it('impide el envío cuando falla la reserva de cuota', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');

        mocks.reserveSummaryEmailQuota.mockRejectedValue(
            new Error('Firestore no disponible'),
        );

        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-valido'),
        );

        expect(response.status).toBe(503);
        expect(mocks.sendTaskSummaryEmail)
            .not.toHaveBeenCalled();
    });

    it('controla un error del servicio SES', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');

        mocks.sendTaskSummaryEmail.mockRejectedValue(
            new Error('Fallo de conexión'),
        );

        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-valido'),
        );

        expect(response.status).toBe(502);

        const body = await response.json();
        expect(body.message)
            .not.toContain('Fallo de conexión');
    });

    it('reconoce el rechazo de mensajes por SES', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');

        const error = new Error('Destinatario rechazado');
        error.name = 'MessageRejected';

        mocks.sendTaskSummaryEmail.mockRejectedValue(error);

        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-valido'),
        );

        expect(response.status).toBe(422);
    });

    it('no informa éxito cuando el envío sigue simulado', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');

        mocks.sendTaskSummaryEmail.mockResolvedValue({
            status: 'simulated',
        });

        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-valido'),
        );

        expect(response.status).toBe(503);

        const body = await response.json();
        expect(body.ok).toBe(false);
    });

    it('nunca reserva cuota si el usuario no está autenticado', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');

        const response = await handler.fetch(
            makeRequest(),
        );

        expect(response.status).toBe(401);
        expect(mocks.reserveSummaryEmailQuota)
            .not.toHaveBeenCalled();
        expect(mocks.sendTaskSummaryEmail)
            .not.toHaveBeenCalled();
    });

    it('bloquea destinatarios ajenos al sandbox sin consumir cuota', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');
        vi.stubEnv(
            'AWS_SES_FROM_EMAIL',
            'otro@example.com',
        );

        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-valido'),
        );

        expect(response.status).toBe(403);
        expect(mocks.reserveSummaryEmailQuota)
            .not.toHaveBeenCalled();
        expect(mocks.sendTaskSummaryEmail)
            .not.toHaveBeenCalled();
    });

    it('impide el envío real si falta la identidad remitente', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');
        vi.stubEnv('AWS_SES_FROM_EMAIL', '');

        const response = await handler.fetch(
            makeRequest('POST', 'Bearer token-valido'),
        );

        expect(response.status).toBe(503);
        expect(mocks.reserveSummaryEmailQuota)
            .not.toHaveBeenCalled();
        expect(mocks.sendTaskSummaryEmail)
            .not.toHaveBeenCalled();
    });
});

describe('Contenido seguro del correo de tareas', () => {
    it('genera contadores correctos', () => {
        const email = buildTaskSummaryEmail([
            {
                title: 'Primera tarea',
                description: '',
                status: 'pendiente',
            },
            {
                title: 'Segunda tarea',
                description: 'En desarrollo',
                status: 'en_progreso',
            },
            {
                title: 'Tercera tarea',
                description: '',
                status: 'completada',
            },
        ]);

        expect(email.summary).toEqual({
            total: 3,
            pendientes: 1,
            enProgreso: 1,
            completadas: 1,
        });

        expect(email.html).toContain('Primera tarea');
        expect(email.text).toContain('Segunda tarea');
    });

    it('escapa contenido HTML potencialmente peligroso', () => {
        const email = buildTaskSummaryEmail([
            {
                title: '<script>alert(1)</script>',
                description: 'Texto & <b>contenido</b>',
                status: 'pendiente',
            },
        ]);

        expect(email.html).toContain('&lt;script&gt;');
        expect(email.html).toContain('&amp;');
        expect(email.html).not.toContain('<script>');
        expect(email.html).not.toContain('<b>contenido</b>');
    });

    it('genera un mensaje cuando no existen tareas', () => {
        const email = buildTaskSummaryEmail([]);

        expect(email.summary.total).toBe(0);
        expect(email.text).toContain(
            'No tienes tareas registradas.',
        );
        expect(email.html).toContain(
            'No tienes tareas registradas.',
        );
    });

    it('rechaza documentos con estados inválidos', () => {
        expect(() =>
            buildTaskSummaryEmail([
                {
                    title: 'Tarea de prueba',
                    description: '',
                    status: 'estado_inexistente',
                },
            ]),
        ).toThrow('INVALID_TASK_DATA');
    });
});
