import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAppsMock, initializeAppMock, getFirebaseConfigMock } =
    vi.hoisted(() => ({
        getAppsMock: vi.fn(),
        initializeAppMock: vi.fn(),
        getFirebaseConfigMock: vi.fn(() => ({
            apiKey: 'test-api-key',
            authDomain: 'test-project.firebaseapp.com',
            projectId: 'test-project',
            appId: 'test-app-id',
        })),
    }));

vi.mock('firebase/app', () => ({
    getApps: getAppsMock,
    initializeApp: initializeAppMock,
}));

vi.mock('../src/lib/firebaseConfig', () => ({
    getFirebaseConfig: getFirebaseConfigMock,
}));

import { getFirebaseApp } from '../src/lib/firebase';

describe('getFirebaseApp', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('inicializa Firebase cuando no existe una aplicación', () => {
        const createdApp = { name: '[DEFAULT]' };

        getAppsMock.mockReturnValue([]);
        initializeAppMock.mockReturnValue(createdApp);

        expect(getFirebaseApp()).toBe(createdApp);
        expect(getFirebaseConfigMock).toHaveBeenCalledOnce();
        expect(initializeAppMock).toHaveBeenCalledWith({
            apiKey: 'test-api-key',
            authDomain: 'test-project.firebaseapp.com',
            projectId: 'test-project',
            appId: 'test-app-id',
        });
    });

    it('reutiliza la aplicación predeterminada existente', () => {
        const existingApp = { name: '[DEFAULT]' };

        getAppsMock.mockReturnValue([existingApp]);

        expect(getFirebaseApp()).toBe(existingApp);
        expect(initializeAppMock).not.toHaveBeenCalled();
        expect(getFirebaseConfigMock).not.toHaveBeenCalled();
    });

    it('inicializa la aplicación predeterminada si solo hay otras aplicaciones', () => {
        const otherApp = { name: 'another-app' };
        const defaultApp = { name: '[DEFAULT]' };

        getAppsMock.mockReturnValue([otherApp]);
        initializeAppMock.mockReturnValue(defaultApp);

        expect(getFirebaseApp()).toBe(defaultApp);
        expect(initializeAppMock).toHaveBeenCalledOnce();
    });
});
