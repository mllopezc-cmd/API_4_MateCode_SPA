import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import { getServerFirebaseApp } from './_firebaseAdmin.js';
import { buildTaskSummaryEmail } from './_taskEmailContent.js';
import { reserveSummaryEmailQuota } from './_emailRateLimit.js';
import { sendTaskSummaryEmail } from './_sesEmailSender.js';

type SummaryResponse = {
    ok: boolean;
    message: string;
    simulated?: boolean;
    retryAfterSeconds?: number;
    summary?: {
        total: number;
        pendientes: number;
        enProgreso: number;
        completadas: number;
    };
};

function jsonResponse(
    status: number,
    body: SummaryResponse,
    retryAfterSeconds?: number,
): Response {
    const headers: Record<string, string> = {
        'Cache-Control': 'no-store',
    };

    if (retryAfterSeconds !== undefined) {
        headers['Retry-After'] = String(retryAfterSeconds);
    }

    return Response.json(body, {
        status,
        headers,
    });
}

export default {
    async fetch(request: Request): Promise<Response> {
        if (request.method !== 'POST') {
            return jsonResponse(405, {
                ok: false,
                message: 'Método no permitido.',
            });
        }

        const authorization =
            request.headers.get('authorization') ?? '';

        const tokenMatch =
            /^Bearer ([^\s]+)$/.exec(authorization);

        if (
            !tokenMatch ||
            tokenMatch[1].length > 8192
        ) {
            return jsonResponse(401, {
                ok: false,
                message: 'Debes iniciar sesión.',
            });
        }

        let app;

        try {
            app = getServerFirebaseApp();
        } catch {
            return jsonResponse(503, {
                ok: false,
                message:
                    'El servicio de resúmenes no está configurado.',
            });
        }

        const auth = getAuth(app);

        let user;

        try {
            const decodedToken = await auth.verifyIdToken(
                tokenMatch[1],
                true,
            );

            user = await auth.getUser(decodedToken.uid);
        } catch {
            return jsonResponse(401, {
                ok: false,
                message:
                    'Tu sesión no es válida. Inicia sesión nuevamente.',
            });
        }

        if (
            user.disabled ||
            !user.emailVerified ||
            !user.email
        ) {
            return jsonResponse(403, {
                ok: false,
                message:
                    'Debes tener una cuenta activa y el correo verificado.',
            });
        }

        // Protección temporal de SES Sandbox:
        // solo permite envíos al correo verificado en SES.
        if (process.env.EMAIL_DELIVERY_MODE === 'ses') {
            const sandboxEmail =
                process.env.AWS_SES_FROM_EMAIL;

            if (!sandboxEmail) {
                return jsonResponse(503, {
                    ok: false,
                    message:
                        'El servicio de correo no está configurado.',
                });
            }

            if (
                user.email.trim().toLowerCase() !==
                sandboxEmail.trim().toLowerCase()
            ) {
                return jsonResponse(403, {
                    ok: false,
                    message:
                        'El envío por correo está limitado a la cuenta de pruebas autorizada.',
                });
            }
        }

        const db = getFirestore(app);

        let emailContent: ReturnType<
            typeof buildTaskSummaryEmail
        >;

        try {
            const snapshot = await db
                .collection('users')
                .doc(user.uid)
                .collection('tasks')
                .get();

            emailContent = buildTaskSummaryEmail(
                snapshot.docs.map((taskDoc) => taskDoc.data()),
            );
        } catch {
            return jsonResponse(503, {
                ok: false,
                message:
                    'No fue posible consultar las tareas. Inténtalo más tarde.',
            });
        }

        // Modo seguro predeterminado:
        // no realiza envíos ni consume cuota.
        if (process.env.EMAIL_DELIVERY_MODE !== 'ses') {
            return jsonResponse(200, {
                ok: true,
                simulated: true,
                message:
                    'Resumen generado en modo de prueba. No se envió ningún correo.',
                summary: emailContent.summary,
            });
        }

        // Reservar cuota antes de solicitar un envío real.
        try {
            const quota = await reserveSummaryEmailQuota(
                db,
                user.uid,
            );

            if (quota.allowed === false) {
                return jsonResponse(
                    429,
                    {
                        ok: false,
                        message:
                            'Has alcanzado el límite de solicitudes de resumen. Inténtalo más tarde.',
                        retryAfterSeconds:
                            quota.retryAfterSeconds,
                    },
                    quota.retryAfterSeconds,
                );
            }
        } catch {
            // Si falla Firestore, el envío no continúa.
            return jsonResponse(503, {
                ok: false,
                message:
                    'No fue posible verificar el límite de envíos. Inténtalo más tarde.',
            });
        }

        try {
            const delivery = await sendTaskSummaryEmail(
                user.email,
                emailContent,
            );

            // No informar éxito si el adaptador
            // no confirmó la aceptación de SES.
            if (delivery.status !== 'accepted') {
                return jsonResponse(503, {
                    ok: false,
                    message:
                        'El servicio de correo no está habilitado.',
                });
            }

            return jsonResponse(200, {
                ok: true,
                simulated: false,
                message:
                    'Amazon SES aceptó la solicitud de envío. La entrega al destinatario está pendiente de confirmación.',
                summary: emailContent.summary,
            });
        } catch (error) {
            const errorName =
                error instanceof Error ? error.name : '';

            if (errorName === 'MessageRejected') {
                return jsonResponse(422, {
                    ok: false,
                    message:
                        'Amazon SES rechazó el mensaje. Comprueba que el remitente y el destinatario estén verificados en la misma región.',
                });
            }

            return jsonResponse(502, {
                ok: false,
                message:
                    'No fue posible procesar el envío del correo. Inténtalo más tarde.',
            });
        }
    },
};
