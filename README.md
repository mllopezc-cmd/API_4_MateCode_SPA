# MateCode SPA

**Accesos rápidos:** [Abrir MateCode en Vercel](https://api-4-mate-code-spa.vercel.app/) · [Ver repositorio en GitHub](https://github.com/mllopezc-cmd/API_4_MateCode_SPA)

**Documentación:** [Arquitectura del proyecto](docs/ARQUITECTURA.md) · [Guía de trabajo con IA](docs/GUIA_TRABAJO_CON_IA.md)

## ¿Qué es MateCode SPA?

**MateCode SPA** es una aplicación web de productividad orientada a organizar tareas y dar seguimiento a actividades personales, académicas o relacionadas con proyectos de programación. Permite registrar tareas, establecer fechas, actualizar su estado y consultar el avance desde un espacio de trabajo asociado a cada cuenta.

Su interfaz se desarrolla con **React, TypeScript y Vite**. La navegación utiliza **React Router**; **Firebase Authentication** gestiona el acceso y **Cloud Firestore** conserva las tareas. La aplicación está publicada en **Vercel**. SPA (*Single Page Application*) significa que la navegación se realiza principalmente dentro de una misma aplicación web, sin recargar toda la página en cada cambio de sección.

MateCode es un **gestor de tareas**: la descripción del proyecto no implica que incluya un compilador, un editor de código o la ejecución de programas.

## Cómo utilizar la aplicación

1. Ingresa a [MateCode SPA](https://api-4-mate-code-spa.vercel.app/).
2. Selecciona **Crear cuenta** si eres un usuario nuevo, o **Iniciar sesión** si ya tienes una cuenta.
3. Completa la verificación de la dirección de correo asociada a tu cuenta cuando el flujo de registro lo solicite.
4. Accede al **Panel principal**, donde se muestra el estado general de tus tareas y las próximas actividades.
5. En **Mis tareas**, crea una actividad con un título; de forma opcional, añade descripción, fecha de inicio y fecha límite.
6. Consulta las tareas por estado, actualiza su información y marca su progreso conforme avances.
7. Utiliza los filtros y los indicadores de vencimiento para identificar las actividades que requieren atención.
8. Cierra sesión al terminar, especialmente si utilizas un equipo compartido.

## Funciones y capacidades disponibles

| Módulo | Funcionalidad |
| --- | --- |
| Acceso de usuarios | Registro, inicio de sesión, verificación de cuenta, recuperación de contraseña y cierre de sesión mediante Firebase Authentication. |
| Panel principal | Indicadores de tareas totales, pendientes, en progreso y completadas; listado de próximas actividades y accesos a la gestión de tareas. |
| Gestión de tareas | Creación, consulta, edición y eliminación de tareas del usuario autenticado. |
| Planificación | Título, descripción opcional, fecha de inicio planificada y fecha límite opcionales. |
| Seguimiento | Estados **Pendiente**, **En progreso** y **Completada**. |
| Organización | Vistas de **Todas**, **Pendientes**, **En progreso**, **Completadas** y **Vencidas**. |
| Priorización | Prioridad informativa calculada a partir de la cercanía de la fecha límite. |
| Persistencia | Almacenamiento de tareas en Cloud Firestore, vinculado a la cuenta autenticada. |
| Navegación e información | Páginas de inicio, acerca del proyecto, ayuda y contacto. |

### Prioridad y vencimientos

La prioridad se calcula automáticamente para tareas no completadas que tienen una fecha límite futura o igual al día actual:

- **Alta:** faltan de 0 a 5 días.
- **Media:** faltan de 6 a 10 días.
- **Baja:** faltan 11 días o más.

Las tareas vencidas, completadas o sin fecha límite no reciben una prioridad automática dentro de esta clasificación. Una tarea puede aparecer como **vencida** aunque su estado de trabajo sea *Pendiente* o *En progreso*: el vencimiento es una condición de calendario y no un cuarto estado editable.

### Alcance actual

Las secciones **Mi perfil** y **Configuración** forman parte de la navegación, pero sus pantallas actuales anuncian capacidades previstas; todavía no ofrecen edición de datos personales ni personalización completa de preferencias. No deben considerarse módulos terminados.

El proyecto no debe presentarse como una plataforma de colaboración multiusuario sobre tareas compartidas: las tareas se administran de forma individual por cuenta.

## Tecnologías utilizadas

- **Frontend:** React, React DOM, TypeScript, Vite y React Router.
- **Identidad:** Firebase Authentication.
- **Base de datos:** Cloud Firestore.
- **Despliegue:** Vercel.
- **Pruebas:** Vitest, React Testing Library y herramientas de prueba de reglas de Firebase.
- **Análisis estático:** ESLint y compilación de TypeScript.

## Organización del repositorio

```text
API_4_MateCode_SPA/
├── api/                    Funciones de servidor desplegadas en Vercel
├── public/                 Recursos públicos
├── src/
│   ├── components/         Componentes reutilizables y protección de rutas
│   ├── context/            Estado y contexto de autenticación
│   ├── lib/                Configuración e inicialización de Firebase
│   ├── pages/              Vistas y rutas de la aplicación
│   ├── services/           Servicios de autenticación y tareas
│   ├── types/              Tipos compartidos de TypeScript
│   └── utils/              Utilidades de fechas y planificación
├── tests/                  Pruebas de componentes, servicios y utilidades
├── rules-tests/            Pruebas de reglas de Firestore
├── docs/
│   ├── ARQUITECTURA.md     Estructura y flujos técnicos
│   └── GUIA_TRABAJO_CON_IA.md  Reglas de colaboración y mantenimiento
├── firestore.rules         Reglas de acceso a los datos
├── firebase.json           Configuración de Firebase CLI
├── .env.example            Plantilla de variables de cliente
└── README.md               Documento principal del proyecto
```

Para conocer las responsabilidades específicas de cada carpeta, consulta la [arquitectura técnica](docs/ARQUITECTURA.md).

## Instalación y ejecución local

### Requisitos

- Node.js `^20.19.0` o `>=22.12.0`.
- npm.
- Un proyecto de Firebase con Authentication y Cloud Firestore configurados.
- Firebase CLI para ejecutar las pruebas con el emulador de Firestore.

### Preparar el entorno

```bash
git clone https://github.com/mllopezc-cmd/API_4_MateCode_SPA.git
cd API_4_MateCode_SPA
npm install
```

Crea `.env.local` en la raíz, usando `.env.example` como modelo. Configura los valores del proyecto Firebase correspondiente al entorno de trabajo.

| Variable | Función |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Clave pública de configuración del cliente Firebase. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Dominio de autenticación de Firebase. |
| `VITE_FIREBASE_PROJECT_ID` | Identificador del proyecto Firebase. |
| `VITE_FIREBASE_APP_ID` | Identificador de la aplicación web en Firebase. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Variable opcional para la configuración de Storage. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Variable opcional de configuración de Firebase Messaging. |

Las variables `VITE_*` forman parte de la compilación del cliente y **no deben contener secretos privados**. Nunca publiques archivos `.env.local` ni credenciales de servidor.

### Ejecutar la aplicación

```bash
npm run dev
```

Abre la dirección local que muestre Vite. Para generar y previsualizar una compilación de producción:

```bash
npm run build
npm run preview
```

La compilación genera los recursos del frontend en `dist/`.

## Evidencia de validación automatizada

**Última ejecución local registrada: 22 de octubre de 2026.** El proyecto dispone de resultados satisfactorios en dos grupos de pruebas independientes:

| Grupo de validación | Ejecución | Pruebas aprobadas | Organización |
| --- | --- | ---: | --- |
| Aplicación, componentes, servicios y utilidades | `npm test` | **334 de 334** | 28 archivos de pruebas aprobados |
| Reglas de seguridad de Cloud Firestore | `firebase emulators:exec --only firestore "npm run test:rules"` | **52 de 52** | 3 conjuntos de pruebas aprobados |
| **Total de pruebas automatizadas registradas** | **Ambas ejecuciones** | **386 de 386 (100 %)** | Sin pruebas fallidas en esas ejecuciones |

Se registró, además, la ejecución satisfactoria de `npm run lint` (análisis estático sin errores) y `npm run build` (compilación de producción completada). Estas comprobaciones son **adicionales** y no se suman al número de casos de prueba.

Los **386 casos aprobados** corresponden a las ejecuciones registradas en esa fecha. El porcentaje indica la proporción de pruebas que aprobaron en dichas ejecuciones; **no equivale a cobertura del 100 % del código**, ni garantiza la ausencia de defectos. Los cambios posteriores deben validarse nuevamente y registrar sus propios resultados.

Para reproducir las verificaciones se incluyen los comandos en el apartado siguiente y los criterios técnicos en la [guía de arquitectura](docs/ARQUITECTURA.md#8-pruebas-y-criterios-de-mantenimiento).

## Pruebas y revisión de cambios

```bash
npm test
npm run lint
npm run build
```

Para comprobar las reglas de acceso de Firestore con Firebase CLI y el emulador:

```bash
firebase emulators:exec --only firestore "npm run test:rules"
```

Antes de publicar cambios, comprueba también:

```bash
git diff --check
git status --short
git diff
```

Estos comandos describen el proceso de validación; no implican que todas las pruebas se hayan ejecutado para esta actualización documental.

## Seguridad y tratamiento de datos

- La aplicación restringe sus páginas privadas según el estado de autenticación y la verificación de la cuenta.
- Las tareas se organizan en Firestore bajo la ruta `users/{uid}/tasks/{taskId}`; cada usuario debe acceder únicamente a sus propios registros.
- Las reglas de Firestore son una barrera independiente de las comprobaciones de la interfaz.
- Los errores de permisos, carga o conectividad deben comunicarse de forma explícita; no deben confundirse con una lista vacía de tareas.
- Las credenciales y los archivos de configuración privada deben permanecer fuera del control de versiones.

## Documentación y navegación

- [Arquitectura de MateCode SPA](docs/ARQUITECTURA.md): módulos, rutas, flujo de autenticación, persistencia, fechas y seguridad.
- [Guía de trabajo con IA](docs/GUIA_TRABAJO_CON_IA.md): instrucciones para modificar el proyecto de forma controlada y verificable.

**Acceso directo:** [Aplicación en Vercel](https://api-4-mate-code-spa.vercel.app/) · [Repositorio en GitHub](https://github.com/mllopezc-cmd/API_4_MateCode_SPA)
