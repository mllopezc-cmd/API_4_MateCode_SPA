import {
    cert,
    getApps,
    initializeApp,
    type App,
} from 'firebase-admin/app';

const SERVER_APP_NAME = 'matecode-server';

export function getServerFirebaseApp(): App {
    const existingApp = getApps().find(
        (app) => app.name === SERVER_APP_NAME,
    );

    if (existingApp) {
        return existingApp;
    }

    const rawCredentials =
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!rawCredentials) {
        throw new Error('FIREBASE_SERVER_NOT_CONFIGURED');
    }

    try {
        const parsed: unknown = JSON.parse(rawCredentials);

        if (
            !parsed ||
            typeof parsed !== 'object'
        ) {
            throw new Error('INVALID_CONFIGURATION');
        }

        const credentials = parsed as Record<string, unknown>;

        if (
            typeof credentials.project_id !== 'string' ||
            typeof credentials.client_email !== 'string' ||
            typeof credentials.private_key !== 'string'
        ) {
            throw new Error('INVALID_CONFIGURATION');
        }

        return initializeApp(
            {
                credential: cert({
                    projectId: credentials.project_id,
                    clientEmail: credentials.client_email,
                    privateKey: credentials.private_key,
                }),
            },
            SERVER_APP_NAME,
        );
    } catch {
        throw new Error('FIREBASE_SERVER_NOT_CONFIGURED');
    }
}
