# MateCode SPA

MateCode es una aplicación web para organizar tareas y facilitar el trabajo de programación. Está desarrollada con React y TypeScript, utiliza React Router para la navegación, Firebase Authentication para la autenticación de usuarios y Cloud Firestore para la persistencia de tareas.

## Estado actual

El proyecto incluye:

- Interfaz web desarrollada con React, TypeScript y Vite.
- Rutas públicas y protegidas.
- Autenticación con Firebase y verificación del correo electrónico.
- Persistencia de tareas en Cloud Firestore.
- Reglas de seguridad para proteger los datos de cada usuario.
- Pruebas automatizadas de componentes, servicios y reglas de Firestore.
- Carga diferida de determinadas páginas para reducir el tamaño del paquete inicial.

## Tecnologías

- React y React DOM
- TypeScript
- Vite
- React Router
- Firebase Authentication
- Cloud Firestore
- Vitest
- React Testing Library
- ESLint

## Requisitos previos

- Node.js `^20.19.0` o `>=22.12.0`.
- npm.
- Un proyecto de Firebase con Authentication y Cloud Firestore configurados.
- Firebase CLI para ejecutar las pruebas de las reglas mediante el emulador.

## Instalación

Clona el repositorio e ingresa en su directorio:

```bash
git clone https://github.com/mllopezc-cmd/API_4_MateCode_SPA.git
cd API_4_MateCode_SPA
npm install
```

Crea el archivo `.env.local` en la raíz del proyecto, tomando `.env.example` como referencia. Configura las variables de Firebase correspondientes a tu entorno.

No subas `.env.local` ni otros archivos que contengan credenciales privadas al repositorio.

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_FIREBASE_API_KEY` | Clave de configuración del cliente Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Dominio de autenticación |
| `VITE_FIREBASE_PROJECT_ID` | Identificador del proyecto Firebase |
| `VITE_FIREBASE_APP_ID` | Identificador de la aplicación Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket de Firebase Storage, si se utiliza |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Identificador del remitente de mensajería, si se utiliza |

Utiliza los valores correspondientes al proyecto de Firebase autorizado para tu entorno.

Las variables con el prefijo `VITE_` quedan disponibles en el código del cliente. No deben contener credenciales privadas ni secretos de servidor. La configuración del cliente no sustituye las reglas de seguridad de Firebase.

## Desarrollo local

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Vite mostrará en la terminal la dirección local desde la que puedes abrir la aplicación.

## Pruebas y validaciones

Ejecuta las pruebas automatizadas:

```bash
npm test
```

Ejecuta ESLint para comprobar la calidad estática del código:

```bash
npm run lint
```

Comprueba los tipos de TypeScript y genera la compilación de producción:

```bash
npm run build
```

Los archivos de producción se generan en el directorio `dist/`.

### Pruebas de las reglas de Firestore

Las pruebas de seguridad requieren Firebase CLI y el emulador de Firestore. Ejecútalas con:

```bash
firebase emulators:exec --only firestore "npm run test:rules"
```

Antes de entregar cambios, ejecuta las validaciones pertinentes y revisa `git diff` y `git status`. No consideres un cambio terminado hasta comprobar que no introduce regresiones.

## Estructura del proyecto

```text
src/
├── components/   Componentes reutilizables
├── context/      Contexto y estado de autenticación
├── lib/          Configuración e inicialización de Firebase
├── pages/        Páginas de la aplicación
├── services/     Operaciones de autenticación y tareas
├── types/        Tipos compartidos de TypeScript
└── utils/        Funciones auxiliares

tests/             Pruebas automatizadas de la aplicación
rules-tests/       Pruebas de reglas de Firestore
docs/              Documentación técnica y guía de colaboración
```

La estructura anterior es orientativa. Consulta la [guía de arquitectura](docs/ARQUITECTURA.md) para conocer las responsabilidades de los módulos, sus límites y los principales flujos de la aplicación.

## Enlaces del proyecto

- Repositorio: [API_4_MateCode_SPA en GitHub](https://github.com/mllopezc-cmd/API_4_MateCode_SPA)
- Despliegue en Vercel: pendiente de confirmar la URL pública.

## Seguridad y colaboración

- No publiques archivos `.env.local`, tokens ni credenciales privadas.
- No debilites las reglas de Firestore para hacer pasar una prueba.
- No confíes en la interfaz como única barrera de acceso: los datos deben estar protegidos también por las reglas de seguridad de Firestore.
- No elimines ni desactives pruebas para ocultar regresiones.
- No cambies contratos, servicios o flujos existentes sin revisar sus dependencias y pruebas.
- Revisa los cambios antes de confirmarlos en Git.

## Documentación adicional

- [Arquitectura del proyecto](docs/ARQUITECTURA.md)
- [Guía de trabajo con IA](docs/GUIA_TRABAJO_CON_IA.md)
