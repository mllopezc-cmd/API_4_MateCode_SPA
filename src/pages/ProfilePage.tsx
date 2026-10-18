import { Link } from 'react-router-dom';

export default function ProfilePage() {
    return (
        <main className="page-shell">
            <h1>Mi perfil</h1>
            <p>Próximamente podrás consultar y modificar tus datos personales.</p>
            <Link to="/panel">Volver al panel</Link>
        </main>
    );
}
