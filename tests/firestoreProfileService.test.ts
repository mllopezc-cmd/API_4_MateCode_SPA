import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    serverTimestamp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
    getAuth: mocks.auth,
}));

vi.mock('firebase/firestore/lite', () => ({
    doc: mocks.doc,
    getDoc: mocks.getDoc,
    setDoc: mocks.setDoc,
    serverTimestamp: mocks.serverTimestamp,
}));

vi.mock('../src/lib/firebase', () => ({
    getFirebaseApp: () => 'app',
}));

vi.mock('../src/lib/firestore', () => ({
    getFirestoreDb: () => 'db',
}));

import {
    getProfileContact,
    saveProfileContact,
    validateProfileContact,
} from '../src/services/firestoreProfileService';

beforeEach(() => {
    vi.clearAllMocks();

    mocks.auth.mockReturnValue({
        currentUser: {
            uid: 'user-1',
            emailVerified: true,
        },
    });

    mocks.doc.mockReturnValue('contact-ref');
    mocks.serverTimestamp.mockReturnValue('server-time');
    mocks.setDoc.mockResolvedValue(undefined);
});

describe('Firestore: contacto privado', () => {
    it(
        'retorna datos vacíos si todavía no hay documento',
        async () => {
            mocks.getDoc.mockResolvedValue({
                exists: () => false,
            });

            await expect(
                getProfileContact('user-1'),
            ).resolves.toEqual({
                phone: '',
                address: '',
            });

            expect(mocks.doc).toHaveBeenCalledWith(
                'db',
                'users',
                'user-1',
                'profile',
                'contact',
            );
        },
    );

    it(
        'lee exclusivamente los campos de contacto',
        async () => {
            mocks.getDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({
                    phone: '+52 33 1234 5678',
                    address: 'Calle 10',
                    role: 'admin',
                }),
            });

            await expect(
                getProfileContact('user-1'),
            ).resolves.toEqual({
                phone: '+52 33 1234 5678',
                address: 'Calle 10',
            });
        },
    );

    it(
        'guarda los campos normalizados con hora del servidor',
        async () => {
            await expect(
                saveProfileContact('user-1', {
                    phone: '  +52 33 1234 5678  ',
                    address: '  Calle   10   ',
                }),
            ).resolves.toEqual({
                phone: '+52 33 1234 5678',
                address: 'Calle 10',
            });

            expect(mocks.setDoc).toHaveBeenCalledWith(
                'contact-ref',
                {
                    phone: '+52 33 1234 5678',
                    address: 'Calle 10',
                    updatedAt: 'server-time',
                },
            );
        },
    );

    it(
        'rechaza teléfonos inválidos antes de escribir',
        async () => {
            await expect(
                saveProfileContact('user-1', {
                    phone: '123',
                    address: 'Calle 10',
                }),
            ).rejects.toThrow(/7 a 15 dígitos/);

            expect(
                mocks.setDoc,
            ).not.toHaveBeenCalled();

            expect(() =>
                validateProfileContact({
                    phone: '',
                    address: 'a'.repeat(241),
                }),
            ).toThrow(/240 caracteres/);
        },
    );

    it(
        'impide leer o escribir para otro usuario',
        async () => {
            await expect(
                getProfileContact('user-2'),
            ).rejects.toThrow(/cuenta verificada/);

            await expect(
                saveProfileContact('user-2', {
                    phone: '',
                    address: '',
                }),
            ).rejects.toThrow(/cuenta verificada/);

            expect(
                mocks.getDoc,
            ).not.toHaveBeenCalled();

            expect(
                mocks.setDoc,
            ).not.toHaveBeenCalled();
        },
    );

    it(
        'impide operaciones sin correo verificado',
        async () => {
            mocks.auth.mockReturnValue({
                currentUser: {
                    uid: 'user-1',
                    emailVerified: false,
                },
            });

            await expect(
                getProfileContact('user-1'),
            ).rejects.toThrow(/cuenta verificada/);

            expect(
                mocks.getDoc,
            ).not.toHaveBeenCalled();
        },
    );
});
