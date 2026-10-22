# Arquitectura de MateCode SPA

**Navegación:** [← Regresar al README principal](../README.md) · [Guía de trabajo con IA](GUIA_TRABAJO_CON_IA.md)

**Accesos rápidos:** [Aplicación en Vercel](https://api-4-mate-code-spa.vercel.app/) · [Repositorio en GitHub](https://github.com/mllopezc-cmd/API_4_MateCode_SPA)

## 1. Propósito y alcance

Este documento describe la organización del código, los límites entre módulos y los flujos principales de MateCode SPA. Su propósito es facilitar el mantenimiento sin alterar contratos existentes ni introducir dependencias innecesarias.

La aplicación sigue una estructura **React + TypeScript + Vite** y navega con **React Router**. Utiliza **Firebase Authentication** para las sesiones y **Cloud Firestore** como persistencia de las tareas. Vercel aloja el despliegue web. La interfaz y las reglas de Firestore asumen responsabilidades complementarias: una ruta protegida no sustituye la autorización de la base de datos.

## 2. Vista general de componentes

```text
Navegador
  └── React + React Router
      ├── Páginas públicas: inicio, acceso, registro, ayuda y contacto
      ├── AuthProvider / AuthContext / ProtectedRoute
      │   └── Firebase Authentication
      └── Páginas privadas: panel, tareas, perfil y configuración
          └── firestoreTaskService
              ├── firestoreTaskMapper
              └── firestore (SDK cliente)
                  └── Cloud Firestore + firestore.rules
```

Los componentes coordinan las acciones visibles; los servicios encapsulan las operaciones de Firebase y el mapper conserva la conversión y validación de datos.

## 3. Responsabilidades por carpeta

### `src/pages/`

Implementa las páginas de la aplicación. Entre sus rutas están `/`, `/acerca-de`, `/iniciar-sesion`, `/crear-cuenta`, `/verificar-correo`, `/recuperar-contrasena`, `/ayuda`, `/contacto`, `/panel`, `/tareas`, `/perfil` y `/configuracion`.

Las vistas `/tareas/pendientes`, `/tareas/en-progreso`, `/tareas/completadas` y `/tareas/vencidas` reutilizan la página de tareas con el filtro correspondiente. `DashboardPage` y `TasksPage` se cargan de forma diferida mediante `React.lazy`.

Las páginas no deben replicar lógica de persistencia que corresponde a los servicios.

### `src/components/`

Contiene piezas de interfaz reutilizables. `ProtectedRoute.tsx` autoriza la visualización de rutas privadas únicamente cuando la sesión tiene el estado previsto; durante la inicialización muestra un estado de carga y ante fallos bloquea el acceso con una opción de reintento.

### `src/context/`

- `AuthContext.tsx`: expone el contrato de autenticación y el hook `useAuth`.
- `AuthProvider.tsx`: observa Firebase Authentication, gestiona el ciclo de vida de la sesión y proporciona el contexto.

No debe duplicarse el estado global de autenticación en cada página ni fusionarse estos módulos sin revisar su dependencia mutua.

### `src/lib/`

- `firebaseConfig.ts`: lee y valida las variables de configuración del cliente Firebase.
- `firebase.ts`: inicializa o reutiliza la aplicación Firebase.
- `firestore.ts`: obtiene la instancia de Cloud Firestore vinculada a la aplicación.

### `src/services/`

- `authService.ts`: concentra las operaciones de acceso y recuperación de cuenta.
- `firestoreTaskService.ts`: contiene las operaciones de lectura y escritura de tareas.
- `firestoreTaskMapper.ts`: transforma y valida la representación de tareas intercambiada con Firestore.
- `taskService.ts` y `taskStorage.ts`: mantienen contratos e implementaciones locales existentes; su presencia no autoriza a reemplazar silenciosamente Firestore por almacenamiento local.

Una falla de red, permisos o validación no debe transformarse en un resultado exitoso aparente.

### `src/types/` y `src/utils/`

`src/types/` contiene los contratos compartidos. El tipo de tarea incluye identificador, título, descripción, estado, fechas y marcas de creación y actualización.

`dateFormatting.ts` presenta fechas para la interfaz. `taskScheduling.ts` calcula vencimientos y prioridad automática sin modificar por sí mismo el estado persistido.

### Otras carpetas y archivos

- `public/`: recursos públicos.
- `api/`: funciones de servidor desplegadas en Vercel; sus secretos y permisos son independientes de las variables públicas del frontend.
- `tests/`: pruebas de componentes, páginas, servicios y utilidades.
- `rules-tests/`: pruebas de acceso a los datos mediante el emulador de Firestore.
- `firestore.rules`: políticas de seguridad de la base de datos.
- `firebase.json`: configuración de Firebase CLI.
- `vitest.rules.config.ts`: ejecución de pruebas de reglas.
- `.env.example`: nombres de variables de cliente con valores de ejemplo.

## 4. Navegación y control de acceso

El punto de entrada monta `AuthProvider` dentro del enrutamiento. El contexto distingue la comprobación inicial de la sesión, la autenticación válida y los estados de error o ausencia de sesión. `ProtectedRoute` utiliza ese estado antes de permitir el contenido privado.

| Área | Rutas principales | Acceso |
| --- | --- | --- |
| Información | `/`, `/acerca-de`, `/ayuda`, `/contacto` | Público |
| Cuenta | `/crear-cuenta`, `/iniciar-sesion`, `/verificar-correo`, `/recuperar-contrasena` | Público según flujo |
| Trabajo | `/panel`, `/tareas` y sus filtros | Sesión autenticada y verificada |
| Cuenta personal | `/perfil`, `/configuracion` | Sesión autenticada y verificada |

Las pantallas `/perfil` y `/configuracion` están presentes, pero actualmente muestran funcionalidades anunciadas para una etapa posterior. Su existencia no debe documentarse como edición completa de perfil ni configuración avanzada.

## 5. Modelo y flujo de tareas

### Modelo de datos

```typescript
type TaskStatus = 'pendiente' | 'en_progreso' | 'completada';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  startDate: string | null;
  dueDate: string | null;
}
```

La colección de tareas de cada usuario se organiza bajo:

```text
users/{uid}/tasks/{taskId}
```

El `uid` debe proceder de la identidad autenticada. No se debe permitir que el cliente acceda arbitrariamente a colecciones de otro usuario.

### Secuencia de una operación

1. La página recibe una acción del usuario: crear, consultar, editar, cambiar de estado o eliminar.
2. La interfaz valida los campos necesarios y el estado de la sesión.
3. `firestoreTaskService.ts` ejecuta la operación sobre Firestore.
4. `firestoreTaskMapper.ts` valida o transforma los datos según su contrato.
5. La página actualiza la vista o presenta el error real. No debe sustituirlo por datos ficticios.

### Vistas, vencimientos y prioridad

Los estados persistidos son **pendiente**, **en_progreso** y **completada**. La vista **Vencidas** es un filtro calculado con la fecha límite: no modifica el modelo `TaskStatus`.

Las tareas no completadas con vencimiento hoy o dentro de los cinco días siguientes reciben prioridad **alta**; de seis a diez días, **media**; y a partir de once días, **baja**. Las tareas completadas, vencidas o sin fecha límite no reciben clasificación automática de prioridad.

El panel principal resume cantidades y presenta hasta cinco tareas próximas, priorizando las que tienen fecha límite y ordenando las demás por creación reciente.

## 6. Tratamiento de fechas

Las fechas de calendario `startDate` y `dueDate` utilizan `YYYY-MM-DD` o `null`. Deben mantenerse como fechas de calendario para evitar cambios de día ocasionados por zonas horarias.

`createdAt` y `updatedAt` son marcas de tiempo distintas de las fechas planificadas. Los cambios en validación o conversión requieren pruebas para valores nulos, límites de calendario y zonas horarias.

En el formulario de tareas, la fecha de inicio no debe quedar en el pasado y la fecha límite, cuando ambas están indicadas, no debe ser anterior a la de inicio.

## 7. Seguridad y configuración

- La sesión y la verificación de cuenta condicionan el acceso a funciones privadas.
- Las reglas `firestore.rules` restringen lectura y escritura, con independencia de la interfaz.
- Las variables `VITE_*` son públicas en el paquete cliente; no deben almacenar secretos de servidor.
- `.env.local` contiene valores de desarrollo y debe permanecer fuera de Git.
- Toda operación de persistencia debe propagar errores reales y conservar el aislamiento entre usuarios.
- Los cambios de permisos exigen casos de prueba autorizados y denegados.

## 8. Pruebas y criterios de mantenimiento

### Resultados documentados

En la última validación local registrada, realizada el **22 de octubre de 2026**, se obtuvieron **334/334 pruebas de aplicación aprobadas en 28 archivos** y **52/52 pruebas de reglas de Firestore aprobadas en 3 conjuntos**. El total asciende a **386/386 pruebas automatizadas aprobadas**. Además, `npm run lint` y `npm run build` concluyeron satisfactoriamente.

Estos resultados pertenecen a ejecuciones locales registradas y se consignan como referencia del proceso de revisión. No acreditan una cobertura total del código, no sustituyen las pruebas de regresión posteriores y no deben confundirse con un estado automatizado de GitHub Actions. Consulta el [resumen de validaciones del README](../README.md#evidencia-de-validacion-automatizada).

### Comandos de comprobación

Ejecutar según el alcance del cambio:

```bash
npm test
npm run lint
npm run build
firebase emulators:exec --only firestore "npm run test:rules"
```

Antes de publicar, revisar:

```bash
git diff --check
git status --short
git diff
```

Una revisión documental no equivale a haber ejecutado las pruebas del proyecto. Los cambios en seguridad, contratos de tareas o fechas deben acompañarse de comprobaciones de regresión y de casos negativos.

## 9. Enlaces relacionados

- [← Volver al README principal](../README.md)
- [Abrir la guía de trabajo con IA](GUIA_TRABAJO_CON_IA.md)
- [Abrir MateCode SPA](https://api-4-mate-code-spa.vercel.app/)
- [Consultar el repositorio](https://github.com/mllopezc-cmd/API_4_MateCode_SPA)
