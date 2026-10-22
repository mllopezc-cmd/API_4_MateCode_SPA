import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from 'react';

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import {
    changeAccountPassword,
    getPasswordValidationError,
    updateAccountDisplayName,
} from '../services/authService';

import {
    EMPTY_PROFILE_CONTACT,
    getProfileContact,
    saveProfileContact,
    type ProfileContact,
} from '../services/firestoreProfileService';

import './ProfilePremium.css';
import './ProfileContact.css';

type ProfileIconName =
    | 'user'
    | 'mail'
    | 'shield'
    | 'lock'
    | 'eye'
    | 'eye-off'
    | 'phone'
    | 'map-pin'
    | 'pencil';

type PasswordFieldName =
    | 'current'
    | 'new'
    | 'confirm';

type PasswordValues = Record<
    PasswordFieldName,
    string
>;

type PasswordVisibility = Record<
    PasswordFieldName,
    boolean
>;

const INITIAL_PASSWORDS: PasswordValues = {
    current: '',
    new: '',
    confirm: '',
};

const INITIAL_VISIBILITY: PasswordVisibility = {
    current: false,
    new: false,
    confirm: false,
};

function ProfileIcon({
    name,
}: {
    name: ProfileIconName;
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="21"
            height="21"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {name === 'user' && (
                <>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2" />
                </>
            )}

            {name === 'mail' && (
                <>
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                    />
                    <path d="m4 7 8 6 8-6" />
                </>
            )}

            {name === 'shield' && (
                <>
                    <path d="M12 2 4 5v6c0 5 3 8 8 11 5-3 8-6 8-11V5l-8-3Z" />
                    <path d="m9 12 2 2 4-4" />
                </>
            )}

            {name === 'lock' && (
                <>
                    <rect
                        x="5"
                        y="10"
                        width="14"
                        height="11"
                        rx="2"
                    />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </>
            )}

            {name === 'eye' && (
                <>
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                </>
            )}

            {name === 'eye-off' && (
                <>
                    <path d="m3 3 18 18" />
                    <path d="M10.6 6.1A11.6 11.6 0 0 1 12 6c6.5 0 10 6 10 6a16.7 16.7 0 0 1-3.2 3.8" />
                    <path d="M6.5 6.6C3.7 8.3 2 12 2 12s3.5 6 10 6c1.5 0 2.9-.3 4.1-.9" />
                </>
            )}

            {name === 'phone' && (
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.09 3.18 2 2 0 0 1 4.08 1h3a2 2 0 0 1 2 1.72c.12.95.36 1.88.7 2.76a2 2 0 0 1-.45 2.11L8.06 8.91a16 16 0 0 0 6 6l1.32-1.27a2 2 0 0 1 2.11-.45c.88.34 1.81.58 2.76.7A2 2 0 0 1 22 16.92Z" />
            )}

            {name === 'map-pin' && (
                <>
                    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                </>
            )}

            {name === 'pencil' && (
                <>
                    <path d="m15 5 4 4" />
                    <path d="M4 20h4l11-11a2.12 2.12 0 0 0-4-4L4 16v4Z" />
                </>
            )}
        </svg>
    );
}

function getErrorText(error: unknown): string {
    return error instanceof Error
        ? error.message
        : 'No se pudo completar la operación. Inténtalo de nuevo.';
}

interface PasswordFieldProps {
    id: string;
    label: string;
    value: string;
    visible: boolean;
    disabled: boolean;
    autoComplete: string;
    onValueChange: (value: string) => void;
    onToggleVisibility: () => void;
}

function PasswordField({
    id,
    label,
    value,
    visible,
    disabled,
    autoComplete,
    onValueChange,
    onToggleVisibility,
}: PasswordFieldProps) {
    return (
        <div className="profile-field">
            <label htmlFor={id}>
                {label}
            </label>

            <div className="profile-password-control">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(event) =>
                        onValueChange(event.target.value)
                    }
                    autoComplete={autoComplete}
                    disabled={disabled}
                    required
                    spellCheck={false}
                />

                <button
                    type="button"
                    className="profile-visibility-button"
                    aria-label={
                        visible
                            ? `Ocultar ${label.toLowerCase()}`
                            : `Mostrar ${label.toLowerCase()}`
                    }
                    aria-pressed={visible}
                    title={
                        visible
                            ? 'Ocultar contraseña'
                            : 'Mostrar contraseña'
                    }
                    onClick={onToggleVisibility}
                    disabled={disabled}
                >
                    <ProfileIcon
                        name={visible ? 'eye-off' : 'eye'}
                    />
                </button>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const {
        status,
        user,
        refreshUser,
    } = useAuth();

    const busyRef = useRef(false);

    const [displayName, setDisplayName] = useState(
        user?.displayName ?? '',
    );

    const [nameSuccess, setNameSuccess] = useState('');
    const [nameError, setNameError] = useState('');

    const [passwordSuccess, setPasswordSuccess] =
        useState('');

    const [passwordError, setPasswordError] =
        useState('');

    const [passwords, setPasswords] =
        useState<PasswordValues>({
            ...INITIAL_PASSWORDS,
        });

    const [visibility, setVisibility] =
        useState<PasswordVisibility>({
            ...INITIAL_VISIBILITY,
        });

    const [isSavingName, setIsSavingName] =
        useState(false);

    const [isChangingPassword, setIsChangingPassword] =
        useState(false);

    // Estado independiente de datos de contacto.
    // Datos confirmados por Firestore y borrador del formulario.
    // Cancelar no puede alterar los datos persistidos.
    const [contact, setContact] =
        useState<ProfileContact>({ ...EMPTY_PROFILE_CONTACT });

    const [contactDraft, setContactDraft] =
        useState<ProfileContact>({ ...EMPTY_PROFILE_CONTACT });

    const [isEditingContact, setIsEditingContact] = useState(false);

    const [contactOwner, setContactOwner] =
        useState<string | null>(null);

    const [contactRetry, setContactRetry] =
        useState(0);

    const [contactLoadError, setContactLoadError] =
        useState('');

    const [contactError, setContactError] =
        useState('');

    const [contactSuccess, setContactSuccess] =
        useState('');

    const [isSavingContact, setIsSavingContact] =
        useState(false);

    const isAuthenticated =
        status === 'authenticated' &&
        Boolean(user?.uid) &&
        user?.emailVerified === true;

    /*
     * La carga es asíncrona.
     * Evita aplicar resultados de una consulta
     * después de desmontar la pantalla
     * o cambiar de usuario.
     */
    useEffect(() => {
        const uid = user?.uid;

        if (
            status !== 'authenticated' ||
            !user?.emailVerified ||
            !uid
        ) {
            return;
        }

        let active = true;

        void getProfileContact(uid)
            .then((data) => {
                if (!active) {
                    return;
                }

                setContact(data);
                setContactDraft(data);
                setIsEditingContact(false);
                setContactSuccess('');
                setContactError('');
                setContactLoadError('');
                setContactOwner(uid);
            })
            .catch(() => {
                if (!active) {
                    return;
                }

                setContactLoadError(
                    'No se pudieron cargar los datos de contacto. Comprueba tu conexión y vuelve a intentarlo.',
                );

                setContactOwner(uid);
            });

        return () => {
            active = false;
        };
    }, [
        status,
        user?.uid,
        user?.emailVerified,
        contactRetry,
    ]);

    const busy =
        isSavingName ||
        isChangingPassword ||
        isSavingContact;

    const contactLoading =
        contactOwner !== user?.uid;

    const contactReady =
        isAuthenticated &&
        !contactLoading &&
        !contactLoadError;

    const hasContactData = Boolean(
        contact.phone.trim() || contact.address.trim(),
    );

    const showContactForm = !hasContactData || isEditingContact;

    const actualName =
        user?.displayName?.trim() ||
        user?.email?.split('@')[0] ||
        'Usuario';

    const avatarLetter =
        actualName.charAt(0).toUpperCase();

    function setPasswordField(
        field: PasswordFieldName,
        value: string,
    ) {
        setPasswords((current) => ({
            ...current,
            [field]: value,
        }));

        setPasswordError('');
        setPasswordSuccess('');
    }

    function toggleVisibility(
        field: PasswordFieldName,
    ) {
        setVisibility((current) => ({
            ...current,
            [field]: !current[field],
        }));
    }

    async function handleNameSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!isAuthenticated || busyRef.current) {
            return;
        }

        const normalizedName = displayName
            .trim()
            .replace(/\s+/g, ' ');

        setNameError('');
        setNameSuccess('');

        if (
            normalizedName.length < 2 ||
            normalizedName.length > 80
        ) {
            setNameError(
                'El nombre debe tener entre 2 y 80 caracteres.',
            );
            return;
        }

        if (
            normalizedName === (user?.displayName ?? '')
        ) {
            setNameSuccess(
                'La información ya está actualizada.',
            );
            return;
        }

        busyRef.current = true;
        setIsSavingName(true);

        try {
            await updateAccountDisplayName(
                normalizedName,
            );

            await refreshUser();

            setDisplayName(normalizedName);
            setNameSuccess(
                'El nombre se actualizó correctamente.',
            );
        } catch (error) {
            setNameError(getErrorText(error));
        } finally {
            busyRef.current = false;
            setIsSavingName(false);
        }
    }

    async function handlePasswordSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!isAuthenticated || busyRef.current) {
            return;
        }

        setPasswordError('');
        setPasswordSuccess('');

        if (
            !passwords.current ||
            !passwords.new ||
            !passwords.confirm
        ) {
            setPasswordError(
                'Completa los tres campos de contraseña.',
            );
            return;
        }

        const validationError =
            getPasswordValidationError(passwords.new);

        if (validationError) {
            setPasswordError(validationError);
            return;
        }

        if (
            passwords.new !== passwords.confirm
        ) {
            setPasswordError(
                'La nueva contraseña y su confirmación no coinciden.',
            );
            return;
        }

        if (
            passwords.current === passwords.new
        ) {
            setPasswordError(
                'La nueva contraseña debe ser diferente de la actual.',
            );
            return;
        }

        busyRef.current = true;
        setIsChangingPassword(true);

        try {
            await changeAccountPassword(
                passwords.current,
                passwords.new,
            );

            setPasswords({ ...INITIAL_PASSWORDS });
            setVisibility({ ...INITIAL_VISIBILITY });

            setPasswordSuccess(
                'La contraseña se cambió correctamente.',
            );
        } catch (error) {
            setPasswordError(getErrorText(error));
        } finally {
            busyRef.current = false;
            setIsChangingPassword(false);
        }
    }

    function handleRetryContact() {
        setContactOwner(null);
        setContactLoadError('');
        setContactError('');
        setContactSuccess('');

        setContactRetry((value) => value + 1);
    }

    function startEditingContact() {
        if (!contactReady || busyRef.current) return;

        setContactDraft({ ...contact });
        setContactError('');
        setContactSuccess('');
        setIsEditingContact(true);
    }

    function cancelEditingContact() {
        if (busyRef.current) return;

        // Recupera lo guardado sin escribir ni borrar Firestore.
        setContactDraft({ ...contact });
        setContactError('');
        setContactSuccess('');
        setIsEditingContact(false);
    }

    async function handleContactSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (
            !contactReady ||
            !user?.uid ||
            busyRef.current
        ) {
            return;
        }

        const uid = user.uid;

        setContactError('');
        setContactSuccess('');

        busyRef.current = true;
        setIsSavingContact(true);

        try {
            const saved = await saveProfileContact(
                uid,
                contactDraft,
            );

            setContact(saved);
            setContactDraft(saved);
            setIsEditingContact(false);
            setContactSuccess(
                'Tus datos de contacto se guardaron correctamente.',
            );
        } catch (error) {
            setContactError(getErrorText(error));
        } finally {
            busyRef.current = false;
            setIsSavingContact(false);
        }
    }

    if (!isAuthenticated) {
        return (
            <main className="page-shell profile-page">
                <h1>Mi perfil</h1>

                <p>
                    Necesitas una sesión verificada
                    para consultar tu perfil.
                </p>

                <Link to="/iniciar-sesion">
                    Iniciar sesión
                </Link>
            </main>
        );
    }

    return (
        <main className="page-shell profile-page profile-page--premium">
            <header className="profile-hero">
                <div
                    className="profile-hero__avatar"
                    aria-hidden="true"
                >
                    {avatarLetter}
                </div>

                <div className="profile-hero__information">
                    <span className="profile-eyebrow">
                        CENTRO DE CUENTA
                    </span>

                    <h1>Mi perfil</h1>

                    <p>
                        Administra tu información y la seguridad
                        de tu cuenta de MateCode.
                    </p>

                    <span className="profile-hero__identity">
                        {actualName}
                    </span>
                </div>
            </header>

            <div className="profile-sections">
                {/* Información personal */}

                <section
                    className="profile-section"
                    aria-labelledby="profile-personal-heading"
                >
                    <div className="profile-section__heading">
                        <span className="profile-section__icon">
                            <ProfileIcon name="user" />
                        </span>

                        <div>
                            <h2 id="profile-personal-heading">
                                Información personal
                            </h2>

                            <p>Datos asociados a tu cuenta.</p>
                        </div>
                    </div>

                    <form onSubmit={handleNameSubmit}>
                        <div className="profile-fields">
                            <div className="profile-field">
                                <label htmlFor="profile-display-name">
                                    Nombre completo
                                </label>

                                <input
                                    id="profile-display-name"
                                    type="text"
                                    autoComplete="name"
                                    value={displayName}
                                    maxLength={80}
                                    onChange={(event) => {
                                        setDisplayName(event.target.value);
                                        setNameError('');
                                        setNameSuccess('');
                                    }}
                                    disabled={busy}
                                    required
                                />
                            </div>

                            <div className="profile-field">
                                <span
                                    className="profile-field__label"
                                    id="profile-email-label"
                                >
                                    Correo electrónico
                                </span>

                                <div
                                    className="profile-readonly"
                                    aria-labelledby="profile-email-label"
                                >
                                    <ProfileIcon name="mail" />

                                    <span>
                                        {user?.email ?? 'No disponible'}
                                    </span>
                                </div>

                                <span
                                    className={
                                        user?.emailVerified
                                            ? 'profile-email-status is-verified'
                                            : 'profile-email-status'
                                    }
                                >
                                    {user?.emailVerified
                                        ? 'Correo verificado'
                                        : 'Correo pendiente de verificación'}
                                </span>
                            </div>
                        </div>

                        {nameError && (
                            <p
                                className="profile-message is-error"
                                role="alert"
                            >
                                {nameError}
                            </p>
                        )}

                        {nameSuccess && (
                            <p
                                className="profile-message is-success"
                                role="status"
                            >
                                {nameSuccess}
                            </p>
                        )}

                        <div className="profile-actions">
                            <button
                                type="submit"
                                className="profile-button profile-button--primary"
                                disabled={busy}
                            >
                                {isSavingName
                                    ? 'Guardando cambios…'
                                    : 'Guardar nombre'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Seguridad de la cuenta */}

                <section
                    className="profile-section"
                    aria-labelledby="profile-security-heading"
                >
                    <div className="profile-section__heading">
                        <span className="profile-section__icon">
                            <ProfileIcon name="shield" />
                        </span>

                        <div>
                            <h2 id="profile-security-heading">
                                Seguridad de la cuenta
                            </h2>

                            <p>Cambia tu contraseña de acceso.</p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordSubmit}>
                        <div className="profile-fields profile-fields--password">
                            <PasswordField
                                id="profile-current-password"
                                label="Contraseña actual"
                                value={passwords.current}
                                visible={visibility.current}
                                disabled={busy}
                                autoComplete="current-password"
                                onValueChange={(value) =>
                                    setPasswordField('current', value)
                                }
                                onToggleVisibility={() =>
                                    toggleVisibility('current')
                                }
                            />

                            <PasswordField
                                id="profile-new-password"
                                label="Nueva contraseña"
                                value={passwords.new}
                                visible={visibility.new}
                                disabled={busy}
                                autoComplete="new-password"
                                onValueChange={(value) =>
                                    setPasswordField('new', value)
                                }
                                onToggleVisibility={() =>
                                    toggleVisibility('new')
                                }
                            />

                            <PasswordField
                                id="profile-confirm-password"
                                label="Confirmar nueva contraseña"
                                value={passwords.confirm}
                                visible={visibility.confirm}
                                disabled={busy}
                                autoComplete="new-password"
                                onValueChange={(value) =>
                                    setPasswordField('confirm', value)
                                }
                                onToggleVisibility={() =>
                                    toggleVisibility('confirm')
                                }
                            />
                        </div>

                        <p className="profile-password-help">
                            Utiliza al menos ocho caracteres,
                            una mayúscula, una minúscula,
                            un número y un símbolo especial.
                        </p>

                        <p className="profile-security-note">
                            <ProfileIcon name="lock" />

                            Tu contraseña actual se utiliza
                            únicamente para verificar tu identidad.
                            No se almacena en el perfil ni se muestra
                            después de guardar.
                        </p>

                        {passwordError && (
                            <p
                                className="profile-message is-error"
                                role="alert"
                            >
                                {passwordError}
                            </p>
                        )}

                        {passwordSuccess && (
                            <p
                                className="profile-message is-success"
                                role="status"
                            >
                                {passwordSuccess}
                            </p>
                        )}

                        <div className="profile-actions">
                            <button
                                type="submit"
                                className="profile-button profile-button--primary"
                                disabled={busy}
                            >
                                {isChangingPassword
                                    ? 'Actualizando contraseña…'
                                    : 'Cambiar contraseña'}
                            </button>

                            <Link
                                to="/recuperar-contrasena"
                                className="profile-button profile-button--secondary"
                            >
                                Recuperar acceso
                            </Link>
                        </div>
                    </form>
                </section>

                {/* Datos de contacto persistentes */}

                <section
                    className="profile-section"
                    aria-labelledby="profile-contact-heading"
                >
                    <div className="profile-section__heading">
                        <span className="profile-section__icon">
                            <ProfileIcon name="mail" />
                        </span>

                        <div>
                            <h2 id="profile-contact-heading">
                                Datos de contacto
                            </h2>

                            <p>
                                Información opcional guardada
                                de forma privada.
                            </p>
                        </div>
                    </div>

                    {contactLoading ? (
                        <p
                            role="status"
                            className="profile-contact-note"
                        >
                            Cargando datos de contacto…
                        </p>
                    ) : contactLoadError ? (
                        <div className="profile-contact-load-error">
                            <p
                                role="alert"
                                className="profile-message is-error"
                            >
                                {contactLoadError}
                            </p>

                            <button
                                type="button"
                                onClick={handleRetryContact}
                                className="profile-button profile-button--secondary"
                                disabled={busy}
                            >
                                Reintentar carga
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Vista compacta de los datos guardados. */}
                            {hasContactData && !isEditingContact && (
                                <div className="profile-contact-overview">
                                    <div className="profile-contact-summary">
                                        <div className="profile-contact-summary__item">
                                            <span className="profile-contact-summary__icon">
                                                <ProfileIcon name="phone" />
                                            </span>
                                            <div className="profile-contact-summary__content">
                                                <span className="profile-contact-summary__label">
                                                    Teléfono
                                                </span>
                                                <span className={contact.phone ? 'profile-contact-summary__value' : 'profile-contact-summary__empty'}>
                                                    {contact.phone || 'No registrado'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="profile-contact-summary__item">
                                            <span className="profile-contact-summary__icon">
                                                <ProfileIcon name="map-pin" />
                                            </span>
                                            <div className="profile-contact-summary__content">
                                                <span className="profile-contact-summary__label">
                                                    Dirección
                                                </span>
                                                <span className={contact.address ? 'profile-contact-summary__value' : 'profile-contact-summary__empty'}>
                                                    {contact.address || 'No registrada'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="profile-contact-overview__actions">
                                        <button
                                            type="button"
                                            className="profile-button profile-button--secondary profile-contact-edit-button"
                                            onClick={startEditingContact}
                                            disabled={busy || !contactReady}
                                            aria-label="Editar datos de contacto"
                                        >
                                            <ProfileIcon name="pencil" />
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Sin datos: formulario directo. Con datos: solo Editar. */}
                            {showContactForm && (
                                <form
                                    id="profile-contact-form"
                                    className="profile-contact-editor"
                                    onSubmit={handleContactSubmit}
                                >
                                    {hasContactData && (
                                        <p className="profile-contact-editor__title">
                                            Editar información de contacto
                                        </p>
                                    )}

                                    <div className="profile-fields profile-contact-fields">
                                        <div className="profile-field">
                                            <label htmlFor="profile-phone">
                                                Teléfono (opcional)
                                            </label>
                                            <input
                                                id="profile-phone"
                                                type="tel"
                                                autoComplete="tel"
                                                inputMode="tel"
                                                maxLength={30}
                                                value={contactDraft.phone}
                                                disabled={busy}
                                                placeholder="Ej. +52 33 1234 5678"
                                                onChange={(event) => {
                                                    setContactDraft((current) => ({
                                                        ...current,
                                                        phone: event.target.value,
                                                    }));
                                                    setContactError('');
                                                    setContactSuccess('');
                                                }}
                                            />
                                        </div>

                                        <div className="profile-field profile-field--address">
                                            <label htmlFor="profile-address">
                                                Dirección (opcional)
                                            </label>
                                            <textarea
                                                id="profile-address"
                                                rows={3}
                                                maxLength={240}
                                                autoComplete="street-address"
                                                value={contactDraft.address}
                                                disabled={busy}
                                                placeholder="Calle, número, ciudad y otros datos que desees registrar"
                                                onChange={(event) => {
                                                    setContactDraft((current) => ({
                                                        ...current,
                                                        address: event.target.value,
                                                    }));
                                                    setContactError('');
                                                    setContactSuccess('');
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <p className="profile-contact-note">
                                        Estos datos son opcionales. Solo tu cuenta
                                        verificada puede consultarlos.
                                    </p>

                                    {contactError && (
                                        <p
                                            role="alert"
                                            className="profile-message is-error"
                                        >
                                            {contactError}
                                        </p>
                                    )}

                                    <div className="profile-actions">
                                        <button
                                            type="submit"
                                            className="profile-button profile-button--primary"
                                            disabled={busy || !contactReady}
                                        >
                                            {isSavingContact
                                                ? 'Guardando contacto…'
                                                : hasContactData
                                                    ? 'Guardar cambios'
                                                    : 'Guardar datos de contacto'}
                                        </button>

                                        {hasContactData && (
                                            <button
                                                type="button"
                                                className="profile-button profile-button--secondary"
                                                disabled={busy}
                                                onClick={cancelEditingContact}
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}

                            {contactSuccess && (
                                <p
                                    role="status"
                                    className="profile-message is-success"
                                >
                                    {contactSuccess}
                                </p>
                            )}
                        </>
                    )}
                </section>
            </div>

            <nav
                className="profile-footer"
                aria-label="Navegación del perfil"
            >
                <Link to="/panel">
                    Volver al panel
                </Link>
            </nav>
        </main>
    );
}
