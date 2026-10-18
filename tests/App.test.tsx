import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '../src/App';

function LocationProbe() {
    const location = useLocation();

    return (
        <output data-testid="current-location">
            {location.pathname}
            {location.search}
            {location.hash}
        </output>
    );
}

function renderApp(path = '/') {
    window.history.replaceState({}, '', '/');

    return render(
        <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
            <LocationProbe />
        </MemoryRouter>,
    );
}

function renderLoginWithReturnTo(from: unknown) {
    return render(
        <MemoryRouter
            initialEntries={[
                {
                    pathname: '/iniciar-sesion',
                    state: { from },
                },
            ]}
        >
            <AppRoutes />
            <LocationProbe />
        </MemoryRouter>,
    );
}

describe('Rutas públicas de MateCode', () => {
    it('muestra la página de inicio', () => {
        renderApp('/');

        expect(
            screen.getByRole('heading', { name: 'MateCode' }),
        ).toBeInTheDocument();
    });

    it('permite acceder a Ayuda sin iniciar sesión', () => {
        renderApp('/ayuda');

        expect(
            screen.getByRole('heading', { name: 'Ayuda de MateCode' }),
        ).toBeInTheDocument();
    });

    it('permite acceder a Acerca de', () => {
        renderApp('/acerca-de');

        expect(
            screen.getByRole('heading', { name: 'Acerca de MateCode' }),
        ).toBeInTheDocument();
    });

    it('permite acceder a Contacto', () => {
        renderApp('/contacto');

        expect(
            screen.getByRole('heading', { name: 'Contacto' }),
        ).toBeInTheDocument();
    });

    it('permite acceder a Crear cuenta', () => {
        renderApp('/crear-cuenta');

        expect(
            screen.getByRole('heading', { name: 'Crear cuenta' }),
        ).toBeInTheDocument();
    });
});

describe('Protección de rutas privadas', () => {
    it('redirige al inicio de sesión al solicitar el panel sin sesión', () => {
        renderApp('/panel');

        expect(
            screen.getByRole('heading', { name: 'Iniciar sesión' }),
        ).toBeInTheDocument();
    });

    it('redirige a iniciar sesión al solicitar tareas sin sesión', () => {
        renderApp('/tareas/pendientes');

        expect(
            screen.getByRole('heading', { name: 'Iniciar sesión' }),
        ).toBeInTheDocument();
    });

    it('permite entrar al panel después del inicio simulado', () => {
        renderApp('/iniciar-sesion');

        fireEvent.click(
            screen.getByRole('button', { name: 'Simular inicio de sesión' }),
        );

        expect(
            screen.getByRole('heading', { name: 'Panel principal' }),
        ).toBeInTheDocument();

        expect(screen.getByTestId('current-location')).toHaveTextContent(
            '/panel',
        );
    });

    it('regresa a la ruta privada solicitada después del inicio simulado', () => {
        renderApp('/tareas/pendientes');

        fireEvent.click(
            screen.getByRole('button', { name: 'Simular inicio de sesión' }),
        );

        expect(
            screen.getByTestId('current-location'),
        ).toHaveTextContent('/tareas/pendientes');
    });

    it('conserva los parámetros y el fragmento de una ruta privada válida', () => {
        renderLoginWithReturnTo({
            pathname: '/tareas',
            search: '?estado=pendiente',
            hash: '#lista',
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Simular inicio de sesión' }),
        );

        expect(
            screen.getByTestId('current-location'),
        ).toHaveTextContent('/tareas?estado=pendiente#lista');
    });

    it('usa el panel como alternativa si el destino es una ruta pública', () => {
        renderLoginWithReturnTo({
            pathname: '/ayuda',
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Simular inicio de sesión' }),
        );

        expect(
            screen.getByRole('heading', { name: 'Panel principal' }),
        ).toBeInTheDocument();

        expect(screen.getByTestId('current-location')).toHaveTextContent(
            '/panel',
        );
    });

    it('usa el panel como alternativa si el destino es desconocido', () => {
        renderLoginWithReturnTo({
            pathname: '/ruta-inexistente',
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Simular inicio de sesión' }),
        );

        expect(
            screen.getByRole('heading', { name: 'Panel principal' }),
        ).toBeInTheDocument();
    });

    it('usa el panel como alternativa si el destino no tiene una ruta válida', () => {
        renderLoginWithReturnTo({
            pathname: '//sitio-externo.example',
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Simular inicio de sesión' }),
        );

        expect(
            screen.getByTestId('current-location'),
        ).toHaveTextContent('/panel');
    });

    it('permite acceder a Ayuda desde una sesión autenticada', () => {
        renderApp('/iniciar-sesion');

        fireEvent.click(
            screen.getByRole('button', { name: 'Simular inicio de sesión' }),
        );

        fireEvent.click(screen.getByRole('link', { name: 'Ayuda' }));

        expect(
            screen.getByRole('heading', { name: 'Ayuda de MateCode' }),
        ).toBeInTheDocument();
    });

    it('cierra la sesión y redirige al inicio de sesión', () => {
        renderApp('/iniciar-sesion');

        fireEvent.click(
            screen.getByRole('button', { name: 'Simular inicio de sesión' }),
        );

        expect(
            screen.getByRole('heading', { name: 'Panel principal' }),
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: 'Cerrar sesión' }),
        );

        expect(
            screen.getByRole('heading', { name: 'Iniciar sesión' }),
        ).toBeInTheDocument();
    });

    it('muestra una página no encontrada para una ruta desconocida', () => {
        renderApp('/ruta-inexistente');

        expect(
            screen.getByRole('heading', { name: 'Página no encontrada' }),
        ).toBeInTheDocument();
    });

    it('usa el panel como alternativa si search tiene un formato inválido', () => {
        renderLoginWithReturnTo({
            pathname: '/tareas',
            search: 'estado=pendiente',
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Simular inicio de sesión' }),
        );

        expect(screen.getByTestId('current-location')).toHaveTextContent(
            '/panel',
        );
    });

    it('usa el panel como alternativa si hash tiene un formato inválido', () => {
        renderLoginWithReturnTo({
            pathname: '/tareas',
            hash: 'lista',
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Simular inicio de sesión' }),
        );

        expect(screen.getByTestId('current-location')).toHaveTextContent(
            '/panel',
        );
    });

    it('impide volver al panel protegido después de cerrar sesión', () => {
        renderApp('/iniciar-sesion');

        fireEvent.click(
            screen.getByRole('button', { name: 'Simular inicio de sesión' }),
        );

        expect(
            screen.getByRole('heading', { name: 'Panel principal' }),
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: 'Cerrar sesión' }),
        );

        expect(
            screen.getByRole('heading', { name: 'Iniciar sesión' }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('heading', { name: 'Panel principal' }),
        ).not.toBeInTheDocument();
    });
});
