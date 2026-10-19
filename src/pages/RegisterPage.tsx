import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
    AuthServiceError,
    getPasswordValidationError,
    register,
} from '../services/authService';

export default function RegisterPage() {
    const navigate = useNavigate();

    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setFormError('');

        const normalizedName = displayName.trim();
        const normalizedEmail = email.trim();

        if (!normalizedName) {
            setFormError('Ingresa tu nombre para continuar.');
            return;
        }

        const passwordError = getPasswordValidationError(password);

        if (passwordError) {
            setFormError(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            setFormError('Las contraseñas no coinciden.');
            return;
        }

        setIsSubmitting(true);

        try {
            await register(
                normalizedEmail,
                password,
                normalizedName,
            );

            navigate('/verificar-correo', {
                replace: true,
                state: { email: normalizedEmail },
            });
        } catch (cause) {
            if (
                cause instanceof AuthServiceError &&
                cause.accountCreated
            ) {
                navigate('/verificar-correo', {
                    replace: true,
                    state: {
                        email: normalizedEmail,
                        notice: cause.message,
                    },
                });
                return;
            }

            setFormError(
                cause instanceof Error
                    ? cause.message
                    : 'No se pudo crear la cuenta. Inténtalo de nuevo.',
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="page-shell">
            <h1>Crear cuenta</h1>
            <p>
                Regístrate en MateCode para organizar y gestionar
                tus tareas.
            </p>

            {formError && (
                <p role="alert">{formError}</p>
            )}

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="register-display-name">
                        Nombre
                    </label>
                    <input
                        id="register-display-name"
                        name="displayName"
                        type="text"
                        autoComplete="name"
                        value={displayName}
                        onChange={(event) =>
                            setDisplayName(event.target.value)
                        }
                        required
                        maxLength={100}
                        disabled={isSubmitting}
                    />
                </div>

                <div>
                    <label htmlFor="register-email">
                        Correo electrónico
                    </label>
                    <input
                        id="register-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) =>
                            setEmail(event.target.value)
                        }
                        required
                        disabled={isSubmitting}
                    />
                </div>

                <div>
                    <label htmlFor="register-password">
                        Contraseña
                    </label>
                    <input
                        id="register-password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={8}
                        aria-describedby="register-password-requirements"
                        required
                        disabled={isSubmitting}
                    />
                    <ul id="register-password-requirements">
                        <li>Mínimo 8 caracteres.</li>
                        <li>Al menos una letra mayúscula y una minúscula.</li>
                        <li>Al menos un número.</li>
                        <li>Al menos un símbolo especial, como !, @ o #.</li>
                    </ul>
                </div>

                <div>
                    <label htmlFor="register-confirm-password">
                        Confirmar contraseña
                    </label>
                    <input
                        id="register-confirm-password"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) =>
                            setConfirmPassword(event.target.value)
                        }
                        minLength={8}
                        required
                        disabled={isSubmitting}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                >
                    {isSubmitting
                        ? 'Creando cuenta...'
                        : 'Crear cuenta'}
                </button>
            </form>

            <p>
                ¿Ya tienes una cuenta?{' '}
                <Link to="/iniciar-sesion">
                    Iniciar sesión
                </Link>
            </p>

            <Link to="/">Volver al inicio</Link>
        </main>
    );
}
