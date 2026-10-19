import { useEffect, useRef, useState } from 'react';
import {
    Link,
    useLocation,
    useNavigate,
} from 'react-router-dom';

import { AuthServiceError } from '../services/authService';
import { useAuth } from '../context/AuthContext';

interface VerificationLocationState {
    email?: unknown;
    notice?: unknown;
}

export default function VerifyEmailPage() {
    const {
        status,
        user,
        sendVerificationEmail,
        refreshUser,
    } = useAuth();

    const location = useLocation();
    const navigate = useNavigate();

    const [isSending, setIsSending] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [formError, setFormError] = useState('');

    const checkInProgress = useRef(false);

    const locationState =
        location.state as VerificationLocationState | null;

    const fallbackEmail =
        typeof locationState?.email === 'string'
            ? locationState.email
            : '';

    const notice =
        typeof locationState?.notice === 'string'
            ? locationState.notice
            : '';

    const displayedEmail = user?.email || fallbackEmail;

    useEffect(() => {
        if (status === 'authenticated') {
            navigate('/panel', { replace: true });
        }
    }, [status, navigate]);

    // Comprueba periódicamente si Firebase ya reconoce
    // que el correo del usuario está verificado.
    useEffect(() => {
        if (status !== 'email-unverified' || !user) {
            return;
        }

        let active = true;

        async function checkVerification() {
            if (
                !active ||
                checkInProgress.current ||
                document.visibilityState === 'hidden'
            ) {
                return;
            }

            checkInProgress.current = true;

            try {
                await refreshUser();
            } catch {
                // La comprobación automática se repetirá.
                // Los errores se muestran al usar el botón manual.
            } finally {
                checkInProgress.current = false;
            }
        }

        function handleVisibilityChange() {
            if (document.visibilityState === 'visible') {
                void checkVerification();
            }
        }

        const intervalId = window.setInterval(() => {
            void checkVerification();
        }, 5000);

        window.addEventListener('focus', checkVerification);
        window.addEventListener('pageshow', checkVerification);
        document.addEventListener(
            'visibilitychange',
            handleVisibilityChange,
        );

        // Comprueba también al montar el efecto.
        void checkVerification();

        return () => {
            active = false;
            window.clearInterval(intervalId);
            window.removeEventListener(
                'focus',
                checkVerification,
            );
            window.removeEventListener(
                'pageshow',
                checkVerification,
            );
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        };
    }, [status, user, refreshUser]);

    async function handleResendVerification() {
        setFeedback('');
        setFormError('');

        if (!user) {
            setFormError(
                'No hay una sesión activa. Inicia sesión para solicitar un nuevo correo de verificación.',
            );
            return;
        }

        if (user.emailVerified) {
            await refreshUser();
            return;
        }

        setIsSending(true);

        try {
            await sendVerificationEmail();

            setFeedback(
                'Hemos solicitado un nuevo correo de verificación. Revisa tu bandeja de entrada y la carpeta de correo no deseado.',
            );
        } catch (cause) {
            setFormError(
                cause instanceof AuthServiceError
                    ? cause.message
                    : 'No se pudo enviar el correo de verificación. Inténtalo nuevamente.',
            );
        } finally {
            setIsSending(false);
        }
    }

    async function handleCheckVerification() {
        setFeedback('');
        setFormError('');
        setIsChecking(true);

        try {
            await refreshUser();

            setFeedback(
                'Comprobación completada. Si tu correo ya está verificado, accederás al panel automáticamente. Si no, revisa tu correo y vuelve a intentarlo.',
            );
        } catch {
            setFormError(
                'No se pudo comprobar el estado de tu cuenta. Inténtalo nuevamente.',
            );
        } finally {
            setIsChecking(false);
        }
    }

    if (status === 'loading') {
        return (
            <main className="page-shell">
                <h1>Verifica tu correo</h1>
                <p>
                    Estamos comprobando el estado de tu sesión...
                </p>
            </main>
        );
    }

    return (
        <main className="page-shell">
            <h1>Verifica tu correo electrónico</h1>

            <p>
                Para completar el proceso, verifica tu dirección
                de correo electrónico desde el enlace que te
                enviamos.
            </p>

            {displayedEmail && (
                <p>
                    Correo de la cuenta:{' '}
                    <strong>{displayedEmail}</strong>
                </p>
            )}

            {notice && (
                <p role="status">{notice}</p>
            )}

            {status === 'email-unverified' && (
                <>
                    <p>
                        Estamos comprobando automáticamente el
                        estado de tu correo. Después de abrir el
                        enlace de verificación, vuelve a esta
                        página si es necesario.
                    </p>

                    {formError && (
                        <p role="alert">{formError}</p>
                    )}

                    {feedback && (
                        <p role="status">{feedback}</p>
                    )}

                    <div>
                        <button
                            type="button"
                            onClick={handleCheckVerification}
                            disabled={isChecking || isSending}
                        >
                            {isChecking
                                ? 'Comprobando...'
                                : 'Ya verifiqué mi correo'}
                        </button>
                    </div>

                    <div>
                        <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={isSending || isChecking}
                        >
                            {isSending
                                ? 'Enviando...'
                                : 'Reenviar correo de verificación'}
                        </button>
                    </div>
                </>
            )}

            {status === 'unauthenticated' && (
                <>
                    <p>
                        No hay una sesión activa. Si ya creaste tu
                        cuenta, puedes iniciar sesión para continuar
                        con el proceso de verificación.
                    </p>

                    <Link to="/iniciar-sesion">
                        Ir a iniciar sesión
                    </Link>
                </>
            )}

            {status === 'error' && (
                <>
                    <p role="alert">
                        No se pudo comprobar el estado de la
                        autenticación. Intenta iniciar sesión
                        nuevamente.
                    </p>

                    <Link to="/iniciar-sesion">
                        Ir a iniciar sesión
                    </Link>
                </>
            )}

            <p>
                <Link to="/">Volver al inicio</Link>
            </p>
        </main>
    );
}
