import { Link } from 'react-router-dom';

export default function HelpPage() {
    return (
        <main className="page-shell">
            <h1>Ayuda de MateCode</h1>
            <p>Encuentra orientación para comenzar a utilizar la plataforma.</p>

            <section aria-labelledby="navigation-help">
                <h2 id="navigation-help">Navegación</h2>
                <p>
                    Desde el inicio puedes consultar información sobre MateCode,
                    acceder a tu cuenta y visitar esta sección de ayuda.
                </p>
            </section>

            <section aria-labelledby="account-help">
                <h2 id="account-help">Cuenta y acceso</h2>
                <p>
                    Las funciones personales requieren iniciar sesión.
                    Si todavía no tienes cuenta, puedes consultar la página de registro.
                </p>
                <Link to="/iniciar-sesion">Iniciar sesión</Link>
                {' | '}
                <Link to="/crear-cuenta">Crear cuenta</Link>
            </section>

            <Link to="/">Volver al inicio</Link>
        </main>
    );
}
