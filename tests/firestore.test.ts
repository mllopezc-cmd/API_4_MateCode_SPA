import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getFirestoreMock, getFirebaseAppMock } = vi.hoisted(() => ({
    getFirestoreMock: vi.fn(),
    getFirebaseAppMock: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: getFirestoreMock,
}));

vi.mock('../src/lib/firebase', () => ({
    getFirebaseApp: getFirebaseAppMock,
}));

import { getFirestoreDb } from '../src/lib/firestore';

describe('getFirestoreDb', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('obtiene Firestore usando la aplicación Firebase existente', () => {
        const app = { name: '[DEFAULT]' };
        const firestore = { type: 'firestore-instance' };

        getFirebaseAppMock.mockReturnValue(app);
        getFirestoreMock.mockReturnValue(firestore);

        expect(getFirestoreDb()).toBe(firestore);
        expect(getFirebaseAppMock).toHaveBeenCalledOnce();
        expect(getFirestoreMock).toHaveBeenCalledWith(app);
    });
});
