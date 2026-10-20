# Arquitectura de MateCode SPA

## 1. Objetivo

Este documento describe la estructura actual de MateCode, las responsabilidades de sus módulos y las reglas que deben respetarse al extender la aplicación.

La prioridad es mantener una arquitectura comprensible, preservar los contratos existentes y evitar refactorizaciones que no aporten un beneficio concreto.

## 2. Estructura de carpetas

### `src/pages/`

Contiene las páginas asociadas a las rutas de la aplicación, como inicio, acceso, registro, recuperación de contraseña, verificación del correo, dashboard y tareas.

Las páginas coordinan la interfaz, el estado local y las llamadas a los servicios. La lógica compartida no debe duplicarse innecesariamente entre páginas.

### `src/components/`

Contiene componentes reutilizables. `ProtectedRoute.tsx` protege las rutas que requieren una sesión válida y utiliza el estado proporcionado por el contexto de autenticación.

### `src/context/`

- `AuthContext.tsx`: define el contrato del contexto y el hook `useAuth`.
- `AuthProvider.tsx`: gestiona el estado y el ciclo de vida de la autenticación, y proporciona el contexto a sus consumidores.

Ambos archivos tienen responsabilidades diferentes y no deben fusionarse solo para reducir el número de archivos.

### `src/lib/`

- `firebaseConfig.ts`: lee y valida las variables de entorno utilizadas para configurar Firebase.
- `firebase.ts`: inicializa o reutiliza la instancia predeterminada de Firebase.
- `firestore.ts`: obtiene la instancia de Firestore asociada a la aplicación inicializada.

Esta separación permite centralizar la configuración y reutilizar la inicialización.

### `src/services/`

- `authService.ts`: encapsula operaciones de Firebase Authentication.
- `firestoreTaskService.ts`: realiza las operaciones de tareas en Cloud Firestore.
- `firestoreTaskMapper.ts`: transforma y valida los datos que se intercambian con Firestore.
- `taskService.ts` y `taskStorage.ts`: conservan la implementación y los contratos existentes de tareas y almacenamiento local. No deben eliminarse ni mezclarse con Firestore sin analizar primero sus dependencias y pruebas.

Las páginas que usan Firestore deben conservar el manejo explícito de errores. Un fallo de red, permisos o datos inválidos no debe presentarse como una lista vacía válida ni activar silenciosamente un fallback a otro almacenamiento.

### `src/types/`

Contiene tipos compartidos, como el modelo de tarea.

### `src/utils/`

Contiene funciones auxiliares que no pertenecen exclusivamente a una página:

- `dateFormatting.ts`: formato de fechas para la interfaz.
- `taskScheduling.ts`: cálculos y reglas auxiliares relacionadas con fechas y planificación de tareas.

### Pruebas

- `tests/`: pruebas de páginas, componentes, servicios, configuración y utilidades.
- `rules-tests/`: pruebas específicas de las reglas de seguridad de Firestore mediante el emulador.

Las pruebas de reglas no sustituyen las pruebas de la aplicación: cubren responsabilidades distintas.

## 3. Flujo de autenticación

1. `AuthProvider` inicializa y observa el estado de Firebase Authentication.
2. El estado y las operaciones disponibles se exponen mediante `AuthContext`.
3. Las páginas consumen el contrato mediante `useAuth`.
4. `ProtectedRoute` decide si se muestra el contenido protegido, un estado de carga o una redirección.
5. Los requisitos de verificación del correo deben respetarse tanto en el flujo de interfaz como en las reglas de seguridad que protegen los datos.

No se debe duplicar el estado global de autenticación en páginas individuales ni cambiar el contrato público del contexto sin actualizar sus consumidores y pruebas.

## 4. Flujo de tareas

1. La página recoge la acción del usuario y valida los datos de entrada.
2. La página utiliza las operaciones exportadas por `firestoreTaskService.ts`.
3. El servicio accede a Firestore a través de `firestore.ts`.
4. `firestoreTaskMapper.ts` transforma y valida los datos almacenados o recibidos.
5. La página presenta el resultado o un error explícito.

La ruta de Firestore organiza las tareas bajo `users/{uid}/tasks/{taskId}`. El UID debe proceder de la sesión autenticada, no de un valor arbitrario proporcionado por el cliente.

Las reglas de Firestore constituyen una barrera de seguridad independiente de la interfaz. No deben debilitarse para solucionar errores de la aplicación.

## 5. Fechas y marcas de tiempo

Las fechas de calendario, como `startDate` y `dueDate`, deben conservar el contrato `YYYY-MM-DD` o `null`, sin conversiones que cambien el día por diferencias de zona horaria.

Las marcas de tiempo de creación y actualización son datos distintos de las fechas de calendario. Deben mantenerse los tipos y las conversiones definidos por el servicio y el mapper.

Cualquier cambio de fechas requiere pruebas para valores nulos, límites de calendario y diferencias de zona horaria cuando sean relevantes.

## 6. Configuración y secretos

- `.env.example` documenta los nombres de las variables necesarias con valores de ejemplo.
- `.env.local` contiene la configuración local y no debe versionarse.
- Las variables `VITE_*` se incorporan al cliente; no deben usarse para almacenar secretos de servidor.
- `firebase.json` configura Firebase CLI para las tareas soportadas por el proyecto.
- `firestore.rules` contiene las reglas de seguridad.
- `vitest.rules.config.ts` configura las pruebas de reglas.

Los archivos de configuración y reglas deben revisarse junto con sus pruebas correspondientes.

## 7. Validaciones antes de entregar

Ejecutar, según el alcance del cambio:

```bash
npm test
npm run lint
npm run build
firebase emulators:exec --only firestore "npm run test:rules"
```

Después, revisar:

```bash
git diff --check
git status --short
git diff
```

Las pruebas del emulador son obligatorias para cambios en reglas o en su comportamiento de autorización. No se debe declarar una validación aprobada sin haberla ejecutado.

## 8. Criterios para modificar la arquitectura

- Mantener una sola responsabilidad principal por módulo.
- Evitar carpetas nuevas si no tienen una responsabilidad real.
- No fusionar archivos únicamente por reducir su cantidad.
- No cambiar contratos públicos sin actualizar consumidores y pruebas.
- No eliminar compatibilidad existente sin evidencia y autorización.
- Mantener los cambios acotados y fáciles de revisar.
