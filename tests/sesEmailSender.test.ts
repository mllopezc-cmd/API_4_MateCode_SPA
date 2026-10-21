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
    send: vi.fn(),
    destroy: vi.fn(),
    clientOptions: vi.fn(),
    awsCredentialsProvider: vi.fn(),
}));

vi.mock('@aws-sdk/client-sesv2', () => ({
    SESv2Client: class {
        constructor(options: unknown) {
            mocks.clientOptions(options);
        }

        send(command: unknown) {
            return mocks.send(command);
        }

        destroy() {
            mocks.destroy();
        }
    },

    SendEmailCommand: class {
        input: unknown;

        constructor(input: unknown) {
            this.input = input;
        }
    },
}));

vi.mock('@vercel/oidc-aws-credentials-provider', () => ({
    awsCredentialsProvider: mocks.awsCredentialsProvider,
}));

import {
    sendTaskSummaryEmail,
} from '../api/_sesEmailSender';

const content = {
    subject: 'MateCode | Resumen de tareas',
    html: '<h1>Resumen de tareas</h1>',
    text: 'Resumen de tareas',
};

describe('Servicio seguro de AWS SESv2', () => {
    beforeEach(() => {
        vi.resetAllMocks();

        vi.stubEnv('EMAIL_DELIVERY_MODE', 'disabled');
        vi.stubEnv('AWS_REGION', '');
        vi.stubEnv('AWS_SES_FROM_EMAIL', '');
        vi.stubEnv(
            'AWS_ROLE_ARN',
            'arn:aws:iam::123456789012:role/MateCode-Vercel-SES-Role',
        );

        mocks.awsCredentialsProvider.mockReturnValue(
            vi.fn(),
        );
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('simula el envío cuando SES está desactivado', async () => {
        const result = await sendTaskSummaryEmail(
            'usuario@example.com',
            content,
        );

        expect(result).toEqual({
            status: 'simulated',
        });

        expect(mocks.send).not.toHaveBeenCalled();
        expect(mocks.clientOptions).not.toHaveBeenCalled();
    });

    it('rechaza destinatarios inválidos', async () => {
        await expect(
            sendTaskSummaryEmail(
                'correo-invalido',
                content,
            ),
        ).rejects.toThrow('SES_INVALID_RECIPIENT');

        expect(mocks.send).not.toHaveBeenCalled();
    });

    it('rechaza contenidos vacíos', async () => {
        await expect(
            sendTaskSummaryEmail(
                'usuario@example.com',
                {
                    subject: '',
                    html: '',
                    text: '',
                },
            ),
        ).rejects.toThrow('SES_INVALID_CONTENT');

        expect(mocks.send).not.toHaveBeenCalled();
    });

    it('requiere configuración antes de un envío real', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');

        await expect(
            sendTaskSummaryEmail(
                'usuario@example.com',
                content,
            ),
        ).rejects.toThrow('SES_NOT_CONFIGURED');

        expect(mocks.send).not.toHaveBeenCalled();
    });

    it('construye correctamente la solicitud SESv2', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');
        vi.stubEnv('AWS_REGION', 'us-east-1');
        vi.stubEnv(
            'AWS_SES_FROM_EMAIL',
            'remitente@example.com',
        );

        mocks.send.mockResolvedValue({
            MessageId: 'ses-test-message-id',
        });

        const result = await sendTaskSummaryEmail(
            'usuario@example.com',
            content,
        );

        expect(mocks.clientOptions).toHaveBeenCalledWith({
            region: 'us-east-1',
            maxAttempts: 2,
            credentials: expect.any(Function),
        });

        expect(mocks.awsCredentialsProvider)
            .toHaveBeenCalledWith({
                roleArn:
                    'arn:aws:iam::123456789012:role/MateCode-Vercel-SES-Role',
            });

        expect(mocks.send).toHaveBeenCalledTimes(1);

        const command = mocks.send.mock.calls[0][0];

        expect(command.input).toMatchObject({
            FromEmailAddress: 'remitente@example.com',
            Destination: {
                ToAddresses: ['usuario@example.com'],
            },
            Content: {
                Simple: {
                    Subject: {
                        Data: content.subject,
                        Charset: 'UTF-8',
                    },
                    Body: {
                        Html: {
                            Data: content.html,
                            Charset: 'UTF-8',
                        },
                        Text: {
                            Data: content.text,
                            Charset: 'UTF-8',
                        },
                    },
                },
            },
        });

        expect(result).toEqual({
            status: 'accepted',
            messageId: 'ses-test-message-id',
        });

        expect(mocks.destroy).toHaveBeenCalledOnce();
    });

    it('propaga errores de SES y libera el cliente', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');
        vi.stubEnv('AWS_REGION', 'us-east-1');
        vi.stubEnv(
            'AWS_SES_FROM_EMAIL',
            'remitente@example.com',
        );

        mocks.send.mockRejectedValue(
            new Error('MessageRejected'),
        );

        await expect(
            sendTaskSummaryEmail(
                'usuario@example.com',
                content,
            ),
        ).rejects.toThrow('MessageRejected');

        expect(mocks.destroy).toHaveBeenCalledOnce();
    });

    it('impide envíos reales si falta el rol IAM', async () => {
        vi.stubEnv('EMAIL_DELIVERY_MODE', 'ses');
        vi.stubEnv('AWS_REGION', 'us-east-2');
        vi.stubEnv(
            'AWS_SES_FROM_EMAIL',
            'remitente@example.com',
        );
        vi.stubEnv('AWS_ROLE_ARN', '');

        await expect(
            sendTaskSummaryEmail(
                'usuario@example.com',
                content,
            ),
        ).rejects.toThrow('SES_NOT_CONFIGURED');

        expect(mocks.awsCredentialsProvider)
            .not.toHaveBeenCalled();
        expect(mocks.send)
            .not.toHaveBeenCalled();
    });
});
