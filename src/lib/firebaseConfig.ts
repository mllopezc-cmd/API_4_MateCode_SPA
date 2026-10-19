import type { FirebaseOptions } from 'firebase/app';

function requireEnv(value: string | undefined, name: string): string {
    const normalizedValue = value?.trim();

    if (!normalizedValue) {
        throw new Error(
            `Falta la variable de entorno ${name}. ` +
            'Revisa la configuración de Firebase.',
        );
    }

    return normalizedValue;
}

export function getFirebaseConfig(): FirebaseOptions {
    const config: FirebaseOptions = {
        apiKey: requireEnv(
            import.meta.env.VITE_FIREBASE_API_KEY,
            'VITE_FIREBASE_API_KEY',
        ),
        authDomain: requireEnv(
            import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            'VITE_FIREBASE_AUTH_DOMAIN',
        ),
        projectId: requireEnv(
            import.meta.env.VITE_FIREBASE_PROJECT_ID,
            'VITE_FIREBASE_PROJECT_ID',
        ),
        appId: requireEnv(
            import.meta.env.VITE_FIREBASE_APP_ID,
            'VITE_FIREBASE_APP_ID',
        ),
    };

    const storageBucket =
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim();

    const messagingSenderId =
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim();

    if (storageBucket) {
        config.storageBucket = storageBucket;
    }

    if (messagingSenderId) {
        config.messagingSenderId = messagingSenderId;
    }

    return config;
}
