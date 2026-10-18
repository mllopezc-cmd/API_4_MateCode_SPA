import { Link } from 'react-router-dom';

export default function ContactPage() {
    return (
        <main className="page-shell">
            <h1>Contacto</h1>
            <p>Próximamente encontrarás aquí los canales de contacto de MateCode.</p>
            <Link to="/">Volver al inicio</Link>
        </main>
    );
}
