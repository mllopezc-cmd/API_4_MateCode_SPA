import type { User } from 'firebase/auth';

type EmailUser = Pick<User, 'getIdToken'>;

interface EmailApiResponse {
    ok?: unknown;
    message?: unknown;
    simulated?: unknown;
}

const SERVICE_ERROR =
    'El servicio de correo no está disponible en este momento.';

export async function requestTaskSummary(
    user: EmailUser,
): Promise<string> {
    let token: string;

    try {
        token = await user.getIdToken();
    } catch {
        throw new Error(
            'No fue posible comprobar tu sesión. Inicia sesión nuevamente.',
        );
    }

    if (!token) {
        throw new Error(
            'No se encontró una sesión válida.',
        );
    }

    let response: Response;

    try {
        response = await fetch('/api/send-summary-tasks', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
            cache: 'no-store',
        });
    } catch {
        throw new Error(SERVICE_ERROR);
    }

    let data: EmailApiResponse;

    try {
        data = await response.json() as EmailApiResponse;
    } catch {
        throw new Error(SERVICE_ERROR);
    }

    if (
        !data ||
        typeof data !== 'object'
    ) {
        throw new Error(SERVICE_ERROR);
    }

    if (!response.ok || data.ok !== true) {
        const message =
            typeof data.message === 'string' &&
                data.message.length <= 400
                ? data.message
                : SERVICE_ERROR;

        throw new Error(message);
    }

    if (
        typeof data.message !== 'string' ||
        typeof data.simulated !== 'boolean'
    ) {
        throw new Error(SERVICE_ERROR);
    }

    return data.message;
}
