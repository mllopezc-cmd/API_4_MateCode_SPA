# MateCode

MateCode es una aplicación web en desarrollo orientada a organizar tareas y facilitar el trabajo de programación.

## Estado del proyecto

Actualmente, el proyecto cuenta con la estructura inicial de React, TypeScript y Vite, además de una configuración básica para pruebas automatizadas.

## Tecnologías

- React
- TypeScript
- Vite
- Vitest
- React Testing Library
- jsdom
- ESLint

## Requisitos previos

- Node.js
- npm

## Instalación

Clona o descarga el proyecto y accede a su carpeta raíz.

Instala las dependencias:

```bash
npm install
```

## Desarrollo local

Inicia el servidor:

```bash
npm run dev
```

Vite mostrará la dirección local donde puedes abrir la aplicación.

## Pruebas

Ejecuta las pruebas automatizadas:

```bash
npm test
```

## Análisis de código

Ejecuta ESLint:

```bash
npm run lint
```

## Compilación de producción

Comprueba los tipos de TypeScript y genera la compilación:

```bash
npm run build
```

Los archivos de producción se generan en la carpeta `dist/`.

## Plan de desarrollo

Las siguientes etapas contemplan la construcción de la interfaz, la separación entre frontend y backend, la autenticación, la persistencia de datos y el despliegue.

Las integraciones con Firebase, AWS SES y Vercel se configurarán en sus etapas específicas.

## Seguridad

No se deben subir credenciales, tokens ni archivos `.env` al repositorio.

Los archivos de ejemplo pueden documentar los nombres de las variables necesarias, pero nunca deben contener secretos reales.
