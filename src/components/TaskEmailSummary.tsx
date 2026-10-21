import {
    useEffect,
    useRef,
    useState,
} from 'react';

import type { User } from 'firebase/auth';

import {
    requestTaskSummary,
} from '../services/taskEmailService';

interface TaskEmailSummaryProps {
    user: Pick<User, 'getIdToken'>;
}

export function TaskEmailSummary({
    user,
}: TaskEmailSummaryProps) {
    const [isSending, setIsSending] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const inFlightRef = useRef(false);
    const mountedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    async function handleSendSummary() {
        if (inFlightRef.current) {
            return;
        }

        inFlightRef.current = true;

        setIsSending(true);
        setMessage('');
        setError('');

        try {
            const result = await requestTaskSummary(user);

            if (mountedRef.current) {
                setMessage(result);
            }
        } catch (caughtError) {
            if (mountedRef.current) {
                setError(
                    caughtError instanceof Error
                        ? caughtError.message
                        : 'No se pudo solicitar el resumen.',
                );
            }
        } finally {
            inFlightRef.current = false;

            if (mountedRef.current) {
                setIsSending(false);
            }
        }
    }

    return (
        <section aria-labelledby="task-email-summary-heading">
            <h2 id="task-email-summary-heading">
                Resumen por correo
            </h2>

            <p>
                Solicita un resumen de tus tareas en
                el correo asociado a tu cuenta.
            </p>

            <div className="task-form-actions">
                <button
                    type="button"
                    onClick={() => {
                        void handleSendSummary();
                    }}
                    disabled={isSending}
                >
                    {isSending
                        ? 'Procesando solicitud...'
                        : 'Enviar resumen'}
                </button>
            </div>

            {message && (
                <p
                    className="task-success"
                    role="status"
                    aria-live="polite"
                >
                    {message}
                </p>
            )}

            {error && (
                <p
                    className="task-error"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </section>
    );
}
