import { Link } from 'react-router-dom';

export default function AboutPage() {
    return (
        <main className="page-shell">
            <h1>Acerca de MateCode</h1>
            <p>
                MateCode es un espacio para organizar tareas y dar seguimiento
                al progreso de tus proyectos.
            </p>
            <Link to="/">Volver al inicio</Link>
        </main>
    );
}
