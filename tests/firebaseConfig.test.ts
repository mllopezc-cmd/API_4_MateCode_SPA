import { afterEach, describe, expect, it, vi } from 'vitest';

import { getFirebaseConfig } from '../src/lib/firebaseConfig';

const validEnv = {
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
    VITE_FIREBASE_APP_ID: 'test-app-id',
    VITE_FIREBASE_STORAGE_BUCKET: '',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '',
};

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('getFirebaseConfig', () => {
    it('construye la configuración con las variables obligatorias', () => {
        vi.stubEnv('VITE_FIREBASE_API_KEY', validEnv.VITE_FIREBASE_API_KEY);
        vi.stubEnv(
            'VITE_FIREBASE_AUTH_DOMAIN',
            validEnv.VITE_FIREBASE_AUTH_DOMAIN,
        );
        vi.stubEnv(
            'VITE_FIREBASE_PROJECT_ID',
            validEnv.VITE_FIREBASE_PROJECT_ID,
        );
        vi.stubEnv('VITE_FIREBASE_APP_ID', validEnv.VITE_FIREBASE_APP_ID);
        vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', '');
        vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '');

        expect(getFirebaseConfig()).toEqual({
            apiKey: 'test-api-key',
            authDomain: 'test-project.firebaseapp.com',
            projectId: 'test-project',
            appId: 'test-app-id',
        });
    });

    it('incluye las variables opcionales cuando tienen valor', () => {
        vi.stubEnv('VITE_FIREBASE_API_KEY', validEnv.VITE_FIREBASE_API_KEY);
        vi.stubEnv(
            'VITE_FIREBASE_AUTH_DOMAIN',
            validEnv.VITE_FIREBASE_AUTH_DOMAIN,
        );
        vi.stubEnv(
            'VITE_FIREBASE_PROJECT_ID',
            validEnv.VITE_FIREBASE_PROJECT_ID,
        );
        vi.stubEnv('VITE_FIREBASE_APP_ID', validEnv.VITE_FIREBASE_APP_ID);
        vi.stubEnv(
            'VITE_FIREBASE_STORAGE_BUCKET',
            'test-project.firebasestorage.app',
        );
        vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '123456789');

        expect(getFirebaseConfig()).toEqual({
            apiKey: 'test-api-key',
            authDomain: 'test-project.firebaseapp.com',
            projectId: 'test-project',
            appId: 'test-app-id',
            storageBucket: 'test-project.firebasestorage.app',
            messagingSenderId: '123456789',
        });
    });

    it('falla claramente cuando falta una variable obligatoria', () => {
        vi.stubEnv('VITE_FIREBASE_API_KEY', '');
        vi.stubEnv(
            'VITE_FIREBASE_AUTH_DOMAIN',
            validEnv.VITE_FIREBASE_AUTH_DOMAIN,
        );
        vi.stubEnv(
            'VITE_FIREBASE_PROJECT_ID',
            validEnv.VITE_FIREBASE_PROJECT_ID,
        );
        vi.stubEnv('VITE_FIREBASE_APP_ID', validEnv.VITE_FIREBASE_APP_ID);

        expect(() => getFirebaseConfig()).toThrow(
            'Falta la variable de entorno VITE_FIREBASE_API_KEY.',
        );
    });

    it('rechaza valores obligatorios compuestos solo por espacios', () => {
        vi.stubEnv('VITE_FIREBASE_API_KEY', '   ');
        vi.stubEnv(
            'VITE_FIREBASE_AUTH_DOMAIN',
            validEnv.VITE_FIREBASE_AUTH_DOMAIN,
        );
        vi.stubEnv(
            'VITE_FIREBASE_PROJECT_ID',
            validEnv.VITE_FIREBASE_PROJECT_ID,
        );
        vi.stubEnv('VITE_FIREBASE_APP_ID', validEnv.VITE_FIREBASE_APP_ID);

        expect(() => getFirebaseConfig()).toThrow(
            'Falta la variable de entorno VITE_FIREBASE_API_KEY.',
        );
    });
});
