import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import {
    AuthServiceError,
    sendPasswordReset,
} from '../../services/authService';

export default function RecoverPasswordPage() {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [formError, setFormError] = useState('');

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setFeedback('');
        setFormError('');

        const normalizedEmail = email.trim();

        if (!normalizedEmail) {
            setFormError('Ingresa tu correo electrónico.');
            return;
        }

        setIsSubmitting(true);

        try {
            await sendPasswordReset(normalizedEmail);

            setFeedback(
                'Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu contraseña. Revisa también la carpeta de correo no deseado.',
            );
        } catch (cause) {
            setFormError(
                cause instanceof AuthServiceError
                    ? cause.message
                    : 'No se pudo procesar la solicitud. Inténtalo nuevamente más tarde.',
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="page-shell">
            <h1>Recuperar contraseña</h1>

            <p>
                Ingresa el correo electrónico asociado a tu
                cuenta y te indicaremos cómo restablecer tu
                contraseña si existe una cuenta con esa dirección.
            </p>

            {feedback && (
                <p role="status">{feedback}</p>
            )}

            {formError && (
                <p role="alert">{formError}</p>
            )}

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="recover-password-email">
                        Correo electrónico
                    </label>

                    <input
                        id="recover-password-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        disabled={isSubmitting}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                >
                    {isSubmitting
                        ? 'Procesando solicitud...'
                        : 'Enviar instrucciones'}
                </button>
            </form>

            <p>
                ¿Recordaste tu contraseña?{' '}
                <Link to="/iniciar-sesion">
                    Volver a iniciar sesión
                </Link>
            </p>

            <p>
                <Link to="/">Volver al inicio</Link>
            </p>
        </main>
    );
}
