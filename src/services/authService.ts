import {
    createUserWithEmailAndPassword,
    getAuth,
    reload,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    type User,
    type UserCredential,
} from 'firebase/auth';

import { getFirebaseApp } from '../lib/firebase';

export class AuthServiceError extends Error {
    readonly code: string | undefined;
    readonly accountCreated: boolean;

    constructor(
        message: string,
        code?: string,
        accountCreated = false,
    ) {
        super(message);
        this.name = 'AuthServiceError';
        this.code = code;
        this.accountCreated = accountCreated;
    }
}

function getAuthInstance() {
    return getAuth(getFirebaseApp());
}

/**
 * Valida la política de contraseñas de MateCode.
 * Devuelve un mensaje si la contraseña no cumple los requisitos.
 */
export function getPasswordValidationError(
    password: string,
): string | null {
    if (password.length < 8) {
        return 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (!/\p{Lu}/u.test(password)) {
        return 'La contraseña debe incluir al menos una letra mayúscula.';
    }

    if (!/\p{Ll}/u.test(password)) {
        return 'La contraseña debe incluir al menos una letra minúscula.';
    }

    if (!/\p{N}/u.test(password)) {
        return 'La contraseña debe incluir al menos un número.';
    }

    if (!/[\p{P}\p{S}]/u.test(password)) {
        return 'La contraseña debe incluir al menos un símbolo especial.';
    }

    return null;
}

function getErrorCode(error: unknown): string | undefined {
    if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string'
    ) {
        return error.code;
    }

    return undefined;
}

function getErrorMessage(code: string | undefined): string {
    switch (code) {
        case 'auth/email-already-in-use':
            return 'Ya existe una cuenta con ese correo electrónico.';

        case 'auth/invalid-email':
            return 'El correo electrónico no tiene un formato válido.';

        case 'auth/weak-password':
            return 'La contraseña no cumple los requisitos de seguridad.';

        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return 'El correo electrónico o la contraseña son incorrectos.';

        case 'auth/too-many-requests':
            return 'Se realizaron demasiados intentos. Espera un momento e inténtalo de nuevo.';

        case 'auth/network-request-failed':
            return 'No se pudo conectar con el servicio. Comprueba tu conexión e inténtalo de nuevo.';

        case 'auth/operation-not-allowed':
            return 'Este método de autenticación no está habilitado en Firebase.';

        case 'auth/requires-recent-login':
            return 'Por seguridad, vuelve a iniciar sesión antes de realizar esta operación.';

        default:
            return 'No se pudo completar la operación de autenticación. Inténtalo de nuevo.';
    }
}

function createServiceError(
    error: unknown,
    accountCreated = false,
): AuthServiceError {
    if (error instanceof AuthServiceError) {
        return error;
    }

    const code = getErrorCode(error);

    return new AuthServiceError(
        accountCreated
            ? 'La cuenta se creó, pero no se pudo completar la configuración. Intenta iniciar sesión y repetir el paso pendiente.'
            : getErrorMessage(code),
        code,
        accountCreated,
    );
}

/**
 * Crea una cuenta, establece su nombre visible y envía
 * el correo de verificación.
 *
 * Si falla una operación posterior a la creación, el error
 * indica que la cuenta ya existe mediante accountCreated.
 */
export async function register(
    email: string,
    password: string,
    displayName: string,
): Promise<UserCredential> {
    const passwordError = getPasswordValidationError(password);

    if (passwordError) {
        throw new AuthServiceError(
            passwordError,
            'auth/weak-password',
        );
    }

    let credential: UserCredential;

    try {
        credential = await createUserWithEmailAndPassword(
            getAuthInstance(),
            email.trim(),
            password,
        );
    } catch (error) {
        throw createServiceError(error);
    }

    try {
        await updateProfile(credential.user, {
            displayName: displayName.trim(),
        });

        await sendEmailVerification(credential.user);

        return credential;
    } catch (error) {
        throw createServiceError(error, true);
    }
}

/** Inicia sesión con correo y contraseña. */
export async function login(
    email: string,
    password: string,
): Promise<UserCredential> {
    try {
        return await signInWithEmailAndPassword(
            getAuthInstance(),
            email.trim(),
            password,
        );
    } catch (error) {
        throw createServiceError(error);
    }
}

/** Cierra la sesión actual de Firebase Authentication. */
export async function logout(): Promise<void> {
    try {
        await signOut(getAuthInstance());
    } catch (error) {
        throw createServiceError(error);
    }
}

/** Envía o reenvía el correo de verificación al usuario indicado. */
export async function sendVerificationEmail(
    user: User,
): Promise<void> {
    try {
        await sendEmailVerification(user);
    } catch (error) {
        throw createServiceError(error);
    }
}

/**
 * Actualiza los datos del usuario desde Firebase.
 * La propiedad emailVerified del objeto queda actualizada.
 */
export async function reloadCurrentUser(user: User): Promise<User> {
    try {
        await reload(user);
        return user;
    } catch (error) {
        throw createServiceError(error);
    }
}

/**
 * Solicita la recuperación de contraseña.
 *
 * No revela si el correo está registrado: un error de usuario
 * inexistente se trata como una solicitud completada.
 */
export async function sendPasswordReset(email: string): Promise<void> {
    try {
        await sendPasswordResetEmail(
            getAuthInstance(),
            email.trim(),
        );
    } catch (error) {
        if (getErrorCode(error) === 'auth/user-not-found') {
            return;
        }

        throw createServiceError(error);
    }
}
