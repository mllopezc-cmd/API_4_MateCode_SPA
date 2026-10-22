import {
    createUserWithEmailAndPassword,
    EmailAuthProvider,
    getAuth,
    reauthenticateWithCredential,
    reload,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
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
 * Política de contraseñas de MateCode.
 *
 * Conserva las reglas existentes.
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

function getErrorCode(
    error: unknown,
): string | undefined {
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

function getErrorMessage(
    code: string | undefined,
): string {
    switch (code) {
        case 'auth/email-already-in-use':
            return 'Ya existe una cuenta con ese correo electrónico.';

        case 'auth/invalid-email':
            return 'El correo electrónico no tiene un formato válido.';

        case 'auth/weak-password':
            return 'La contraseña no cumple los requisitos de seguridad.';

        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/invalid-password':
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

        case 'auth/user-disabled':
            return 'Esta cuenta se encuentra deshabilitada.';

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
 * Obtiene el usuario de la sesión actual.
 *
 * Se utiliza para operaciones sobre
 * la cuenta, no para consultar tareas.
 */
function getCurrentAccountUser(): User {
    const user = getAuthInstance().currentUser;

    if (!user) {
        throw new AuthServiceError(
            'Debes iniciar sesión para modificar tu cuenta.',
            'auth/user-not-authenticated',
        );
    }

    if (!user.emailVerified) {
        throw new AuthServiceError(
            'Debes verificar tu correo antes de modificar tu cuenta.',
            'auth/email-not-verified',
        );
    }

    return user;
}

/**
 * Crea una cuenta, establece el nombre
 * y envía el correo de verificación.
 *
 * Si la configuración posterior falla,
 * accountCreated indica que la cuenta existe.
 */
export async function register(
    email: string,
    password: string,
    displayName: string,
): Promise<UserCredential> {
    const passwordError =
        getPasswordValidationError(password);

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

/** Envía o reenvía el correo de verificación. */
export async function sendVerificationEmail(
    user: User,
): Promise<void> {
    try {
        await sendEmailVerification(user);
    } catch (error) {
        throw createServiceError(error);
    }
}

/** Recarga los datos del usuario actual. */
export async function reloadCurrentUser(
    user: User,
): Promise<User> {
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
 * Conserva el comportamiento anterior:
 * no confirma si un correo está registrado.
 */
export async function sendPasswordReset(
    email: string,
): Promise<void> {
    try {
        await sendPasswordResetEmail(
            getAuthInstance(),
            email.trim(),
        );
    } catch (error) {
        if (
            getErrorCode(error) === 'auth/user-not-found'
        ) {
            return;
        }

        throw createServiceError(error);
    }
}

/**
 * Etapa 8 - Bloque 4B.
 *
 * Actualiza el nombre visible del usuario.
 *
 * No cambia su correo, UID ni credenciales.
 */
export async function updateAccountDisplayName(
    displayName: string,
): Promise<void> {
    const user = getCurrentAccountUser();

    const normalizedName = displayName
        .trim()
        .replace(/\s+/g, ' ');

    if (
        normalizedName.length < 2 ||
        normalizedName.length > 80
    ) {
        throw new AuthServiceError(
            'El nombre debe tener entre 2 y 80 caracteres.',
            'profile/invalid-name',
        );
    }

    try {
        await updateProfile(user, {
            displayName: normalizedName,
        });
    } catch (error) {
        throw createServiceError(error);
    }
}

/**
 * Etapa 8 - Bloque 4B.
 *
 * Cambio seguro de contraseña.
 *
 * 1. Comprueba la política local.
 * 2. Identifica al usuario autenticado.
 * 3. Reautentica con la contraseña actual.
 * 4. Actualiza la contraseña en Firebase.
 *
 * No registra ni almacena contraseñas
 * en Firestore o localStorage.
 */
export async function changeAccountPassword(
    currentPassword: string,
    newPassword: string,
): Promise<void> {
    const user = getCurrentAccountUser();

    if (!currentPassword) {
        throw new AuthServiceError(
            'Introduce tu contraseña actual.',
            'profile/current-password-required',
        );
    }

    const validationError =
        getPasswordValidationError(newPassword);

    if (validationError) {
        throw new AuthServiceError(
            validationError,
            'auth/weak-password',
        );
    }

    if (currentPassword === newPassword) {
        throw new AuthServiceError(
            'La nueva contraseña debe ser diferente de la actual.',
            'profile/same-password',
        );
    }

    if (!user.email) {
        throw new AuthServiceError(
            'No se encontró un correo electrónico asociado a la cuenta.',
            'profile/email-unavailable',
        );
    }

    const hasPasswordProvider = user.providerData.some(
        (provider) => provider.providerId === 'password',
    );

    if (!hasPasswordProvider) {
        throw new AuthServiceError(
            'Esta cuenta no tiene habilitado el acceso mediante correo y contraseña.',
            'profile/password-provider-unavailable',
        );
    }

    try {
        const credential = EmailAuthProvider.credential(
            user.email,
            currentPassword,
        );

        await reauthenticateWithCredential(
            user,
            credential,
        );
    } catch (error) {
        const code = getErrorCode(error);

        if (
            code === 'auth/invalid-credential' ||
            code === 'auth/wrong-password' ||
            code === 'auth/invalid-password'
        ) {
            throw new AuthServiceError(
                'La contraseña actual no es correcta.',
                code,
            );
        }

        throw createServiceError(error);
    }

    try {
        await updatePassword(user, newPassword);
    } catch (error) {
        throw createServiceError(error);
    }
}
