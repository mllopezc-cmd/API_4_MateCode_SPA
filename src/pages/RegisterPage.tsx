import { Link } from 'react-router-dom';

export default function RegisterPage() {
    return (
        <main className="page-shell">
            <h1>Crear cuenta</h1>
            <p>Próximamente podrás registrar tu cuenta de MateCode.</p>
            <Link to="/iniciar-sesion">Ya tengo una cuenta</Link>
            {' | '}
            <Link to="/">Volver al inicio</Link>
        </main>
    );
}
