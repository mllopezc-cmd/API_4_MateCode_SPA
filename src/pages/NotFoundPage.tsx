import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <main className="page-shell">
            <h1>Página no encontrada</h1>
            <p>La dirección que buscas no existe en MateCode.</p>
            <Link to="/">Volver al inicio</Link>
        </main>
    );
}
