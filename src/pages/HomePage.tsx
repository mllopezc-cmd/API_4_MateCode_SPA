import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <main className="page-shell home-page">
            <h1>MateCode</h1>
            <p>Organiza tus tareas y avanza en tus proyectos.</p>
            <nav aria-label="Navegación principal">
                <Link to="/acerca-de">Acerca de</Link>
                {' | '}
                <Link to="/iniciar-sesion">Iniciar sesión</Link>
                {' | '}
                <Link to="/crear-cuenta">Crear cuenta</Link>
                {' | '}
                <Link to="/contacto">Contacto</Link>
                {' | '}
                <Link to="/ayuda">Ayuda</Link>
            </nav>
        </main>
    );
}
