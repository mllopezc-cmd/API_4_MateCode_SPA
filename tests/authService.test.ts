import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    const auth = { currentUser: null };

    return {
        auth,
        getAuthMock: vi.fn(() => auth),
        getFirebaseAppMock: vi.fn(() => ({ name: '[DEFAULT]' })),
        createUserMock: vi.fn(),
        signInMock: vi.fn(),
        signOutMock: vi.fn(),
        updateProfileMock: vi.fn(),
        sendVerificationMock: vi.fn(),
        reloadMock: vi.fn(),
        sendPasswordResetMock: vi.fn(),
    };
});

vi.mock('firebase/auth', () => ({
    getAuth: mocks.getAuthMock,
    createUserWithEmailAndPassword: mocks.createUserMock,
    signInWithEmailAndPassword: mocks.signInMock,
    signOut: mocks.signOutMock,
    updateProfile: mocks.updateProfileMock,
    sendEmailVerification: mocks.sendVerificationMock,
    reload: mocks.reloadMock,
    sendPasswordResetEmail: mocks.sendPasswordResetMock,
}));

vi.mock('../src/lib/firebase', () => ({
    getFirebaseApp: mocks.getFirebaseAppMock,
}));

import type { User, UserCredential } from 'firebase/auth';

import {
    AuthServiceError,
    getPasswordValidationError,
    login,
    logout,
    register,
    reloadCurrentUser,
    sendPasswordReset,
    sendVerificationEmail,
} from '../src/services/authService';

const testUser = {
    uid: 'test-user-id',
    displayName: 'Usuario de prueba',
    email: 'test@example.com',
    emailVerified: false,
} as User;

const testCredential = {
    user: testUser,
} as UserCredential;

describe('authService', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.getAuthMock.mockReturnValue(mocks.auth);
        mocks.createUserMock.mockResolvedValue(testCredential);
        mocks.signInMock.mockResolvedValue(testCredential);
        mocks.signOutMock.mockResolvedValue(undefined);
        mocks.updateProfileMock.mockResolvedValue(undefined);
        mocks.sendVerificationMock.mockResolvedValue(undefined);
        mocks.reloadMock.mockResolvedValue(undefined);
        mocks.sendPasswordResetMock.mockResolvedValue(undefined);
    });

    it('registra una cuenta, establece el nombre y envía verificación', async () => {
        const result = await register(
            ' test@example.com ',
            'Password123!',
            ' Usuario de prueba ',
        );

        expect(result).toBe(testCredential);
        expect(mocks.createUserMock).toHaveBeenCalledWith(
            mocks.auth,
            'test@example.com',
            'Password123!',
        );
        expect(mocks.updateProfileMock).toHaveBeenCalledWith(
            testUser,
            { displayName: 'Usuario de prueba' },
        );
        expect(mocks.sendVerificationMock).toHaveBeenCalledWith(testUser);
    });

    it('traduce un error al crear la cuenta', async () => {
        mocks.createUserMock.mockRejectedValue({
            code: 'auth/email-already-in-use',
        });

        await expect(
            register('test@example.com', 'Password123!', 'Usuario'),
        ).rejects.toMatchObject({
            name: 'AuthServiceError',
            code: 'auth/email-already-in-use',
            accountCreated: false,
            message: 'Ya existe una cuenta con ese correo electrónico.',
        });

        expect(mocks.updateProfileMock).not.toHaveBeenCalled();
    });

    it('indica que la cuenta existe si falla un paso posterior al registro', async () => {
        mocks.sendVerificationMock.mockRejectedValue({
            code: 'auth/network-request-failed',
        });

        await expect(
            register('test@example.com', 'Password123!', 'Usuario'),
        ).rejects.toMatchObject({
            name: 'AuthServiceError',
            accountCreated: true,
        });
    });

    it('inicia sesión y normaliza el correo', async () => {
        const result = await login(
            ' test@example.com ',
            'Password123!',
        );

        expect(result).toBe(testCredential);
        expect(mocks.signInMock).toHaveBeenCalledWith(
            mocks.auth,
            'test@example.com',
            'Password123!',
        );
    });

    it('traduce credenciales incorrectas sin revelar cuál falló', async () => {
        mocks.signInMock.mockRejectedValue({
            code: 'auth/invalid-credential',
        });

        await expect(
            login('test@example.com', 'incorrecta'),
        ).rejects.toThrow(
            'El correo electrónico o la contraseña son incorrectos.',
        );
    });

    it('cierra la sesión de Firebase', async () => {
        await expect(logout()).resolves.toBeUndefined();

        expect(mocks.signOutMock).toHaveBeenCalledWith(mocks.auth);
    });

    it('envía el correo de verificación al usuario indicado', async () => {
        await sendVerificationEmail(testUser);

        expect(mocks.sendVerificationMock).toHaveBeenCalledWith(testUser);
    });

    it('recarga el usuario y devuelve la misma referencia', async () => {
        await expect(reloadCurrentUser(testUser)).resolves.toBe(testUser);

        expect(mocks.reloadMock).toHaveBeenCalledWith(testUser);
    });

    it('solicita la recuperación de contraseña', async () => {
        await sendPasswordReset(' test@example.com ');

        expect(mocks.sendPasswordResetMock).toHaveBeenCalledWith(
            mocks.auth,
            'test@example.com',
        );
    });

    it('no revela si el correo existe durante la recuperación', async () => {
        mocks.sendPasswordResetMock.mockRejectedValue({
            code: 'auth/user-not-found',
        });

        await expect(
            sendPasswordReset('unknown@example.com'),
        ).resolves.toBeUndefined();
    });

    it('expone errores con un tipo reconocible por la interfaz', async () => {
        mocks.signOutMock.mockRejectedValue({
            code: 'auth/too-many-requests',
        });

        try {
            await logout();
            throw new Error('Se esperaba que logout fallara.');
        } catch (error) {
            expect(error).toBeInstanceOf(AuthServiceError);
            expect(error).toMatchObject({
                code: 'auth/too-many-requests',
                accountCreated: false,
            });
        }
    });

    it.each([
        ['corta', 'Pa1!abc', 'al menos 8 caracteres'],
        ['sin mayúscula', 'password1!', 'letra mayúscula'],
        ['sin minúscula', 'PASSWORD1!', 'letra minúscula'],
        ['sin número', 'Password!!', 'al menos un número'],
        ['sin símbolo', 'Password12', 'símbolo especial'],
    ])(
        'rechaza una contraseña %s',
        async (_caseName, password, expectedMessage) => {
            await expect(
                register('test@example.com', password, 'Usuario'),
            ).rejects.toThrow(expectedMessage);

            expect(mocks.createUserMock).not.toHaveBeenCalled();
        },
    );

    it('acepta una contraseña que cumple todos los requisitos', () => {
        expect(
            getPasswordValidationError('Password123!'),
        ).toBeNull();
    });

    it('devuelve null para una contraseña válida', () => {
        expect(
            getPasswordValidationError('ÁrbolSeguro9!'),
        ).toBeNull();
    });
});
