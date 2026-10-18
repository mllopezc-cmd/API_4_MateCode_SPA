import { Link } from 'react-router-dom';

export default function SettingsPage() {
    return (
        <main className="page-shell">
            <h1>Configuración</h1>
            <p>Próximamente podrás personalizar las preferencias de MateCode.</p>
            <Link to="/panel">Volver al panel</Link>
        </main>
    );
}
