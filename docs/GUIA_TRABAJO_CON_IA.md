# Guía de trabajo con IA para MateCode SPA

**Navegación:** [← Regresar al README principal](../README.md) · [Arquitectura del proyecto](ARQUITECTURA.md)

**Accesos rápidos:** [Aplicación en Vercel](https://api-4-mate-code-spa.vercel.app/) · [Repositorio en GitHub](https://github.com/mllopezc-cmd/API_4_MateCode_SPA)

## 1. Propósito

Esta guía establece cómo utilizar asistentes de inteligencia artificial para estudiar, mantener, corregir o ampliar MateCode SPA sin introducir regresiones, debilitar la seguridad ni realizar cambios difíciles de auditar.

La IA debe trabajar sobre el código y las pruebas **existentes**, no sobre suposiciones ni sobre una arquitectura tomada de otro proyecto. Debe diferenciar entre lo confirmado por los archivos, lo inferido y lo que todavía requiere prueba.

## 2. Documentos de referencia

Antes de proponer modificaciones, consultar estos archivos:

- [README principal](../README.md): descripción del producto, funciones, uso e instalación.
- [Arquitectura técnica](ARQUITECTURA.md): módulos, contratos, navegación, persistencia y reglas de seguridad.
- `package.json`: scripts y dependencias realmente instaladas.
- `src/`: código de aplicación y servicios.
- `tests/`, `rules-tests/` y `firestore.rules`: comportamiento esperado y controles de seguridad.

## 3. Contexto que debe preservarse

MateCode SPA utiliza React, TypeScript, Vite y React Router, con Firebase Authentication para la identidad y Cloud Firestore para las tareas. La aplicación se despliega en Vercel.

Deben preservarse las rutas públicas y privadas, los estados de autenticación, el aislamiento de datos por UID, los contratos de tareas, el manejo explícito de errores y el funcionamiento de las vistas del panel y las tareas.

No deben inventarse capacidades a partir del nombre de un menú. En particular, las pantallas de perfil y configuración actuales son preparatorias, no módulos completos de edición o personalización.

## 4. Reglas obligatorias para la IA

1. **Inspeccionar antes de modificar.** Abrir los archivos afectados, identificar dependencias y revisar pruebas existentes.
2. **Preservar el comportamiento comprobado.** No alterar interfaces públicas, rutas, tipos ni datos sin justificar y validar la modificación.
3. **Reducir el alcance.** Preferir correcciones focalizadas frente a refactorizaciones amplias no solicitadas.
4. **No ocultar fallos.** Nunca sustituir errores de red, autorización o datos inválidos por resultados aparentemente exitosos.
5. **Mantener la separación por UID.** No permitir leer, editar ni eliminar tareas de otra cuenta.
6. **Proteger secretos.** Nunca solicitar ni publicar contraseñas, tokens, claves privadas ni contenidos de `.env.local`.
7. **Respetar la arquitectura.** No mezclar silenciosamente Firestore y almacenamiento local ni desplazar la lógica de servicios a páginas sin motivo.
8. **No debilitar controles.** No desactivar reglas de Firestore, TypeScript, ESLint o verificaciones para hacer desaparecer errores.
9. **Conservar pruebas.** No borrarlas ni modificar sus expectativas únicamente para que aprueben.
10. **Evitar dependencias y carpetas innecesarias.** Toda adición debe tener una responsabilidad verificable.
11. **Documentar los cambios.** Actualizar README o arquitectura cuando cambien rutas, variables, estructura o funciones públicas.
12. **No publicar sin permiso.** No ejecutar `git commit`, `git push`, despliegues ni cambios de configuración sensible sin autorización explícita.

## 5. Proceso de trabajo

### Fase 1. Comprensión y diagnóstico

- Definir el problema o la capacidad solicitada y los criterios de aceptación.
- Revisar el estado actual de los archivos, pruebas, dependencias y configuración.
- Identificar el punto de entrada y el flujo que se verá afectado.
- Diferenciar errores preexistentes de posibles regresiones.
- Registrar los riesgos para datos, autenticación, fechas, navegación y despliegue.

### Fase 2. Propuesta acotada

Antes de cambiar código, indicar los archivos implicados, la modificación prevista, su justificación y cómo se comprobará. Una corrección de un módulo no autoriza modificar otros sin relación.

### Fase 3. Implementación incremental

- Cambiar primero el componente o servicio directamente responsable.
- Respetar los nombres y contratos utilizados en el repositorio.
- Incorporar pruebas de regresión cuando se modifica comportamiento.
- Revisar el diff antes de ampliar el alcance.

### Fase 4. Validación

Ejecutar, cuando corresponda:

```bash
npm test
npm run lint
npm run build
```

Si la modificación afecta reglas o autorización en Firestore:

```bash
firebase emulators:exec --only firestore "npm run test:rules"
```

Completar con:

```bash
git diff --check
git status --short
git diff
```

Los resultados deben registrarse como **aprobado**, **fallido** o **no ejecutado**. No se puede declarar una prueba aprobada sin ejecutarla.

### Fase 5. Revisión y entrega

Comprobar que se cumple el objetivo, que los casos normales y negativos se comportan de acuerdo con lo esperado y que no se comprometieron datos ni secretos. Informar los archivos cambiados, pruebas, limitaciones y acciones pendientes. Solo el responsable del proyecto autoriza la publicación.

## 6. Casos que requieren especial precaución

### Autenticación y rutas

Conservar la semántica de `AuthProvider`, `AuthContext` y `ProtectedRoute`. Los estados de carga, error, sesión inválida y cuenta no verificada deben impedir acceder al contenido privado cuando corresponda. No corregir un problema de sesión anulando la protección de las rutas.

### Tareas y persistencia

El modelo mantiene los estados `pendiente`, `en_progreso` y `completada`. La condición de vencimiento y la prioridad son cálculos complementarios, no nuevos estados persistidos. Las operaciones deben mantener el aislamiento de la colección `users/{uid}/tasks/{taskId}`.

Las tareas no deben desaparecer de la vista como si no existieran cuando falla Firestore. Se debe informar el fallo y ofrecer recuperación cuando el diseño ya la contempla.

### Fechas y planificación

Preservar el contrato `YYYY-MM-DD` o `null` para `startDate` y `dueDate`. Evitar conversiones que modifiquen el día por diferencias de zona horaria. Probar casos nulos, fechas límite, vencimientos y prioridades.

### Datos y permisos

Toda modificación de reglas debe incluir al menos un caso permitido y uno denegado. Las comprobaciones visuales de la interfaz no sustituyen las reglas de la base de datos.

## 7. Formato recomendado para solicitar una modificación

```text
Objetivo: [funcionalidad o error]
Comportamiento observado: [qué ocurre actualmente]
Comportamiento esperado: [qué debería ocurrir]
Restricciones: [módulos y datos que no deben cambiar]
Archivos relacionados: [si se conocen]
Prueba de aceptación: [cómo confirmar el resultado]
```

Si falta una decisión que cambie permisos, privacidad, costes o compatibilidad, debe solicitarse antes de aplicar una operación irreversible. Los detalles técnicos menores pueden resolverse siguiendo las convenciones existentes.

## 8. Criterios de finalización

Un cambio se considera listo para revisión únicamente cuando cumple los criterios solicitados, conserva los contratos relevantes, tiene pruebas pertinentes y presenta un diff comprensible. Los fallos pendientes y las pruebas no ejecutadas deben declararse de forma expresa.

La aprobación y publicación corresponden al responsable de MateCode SPA.

## 9. Enlaces relacionados

- [← Volver al README principal](../README.md)
- [Consultar la arquitectura](ARQUITECTURA.md)
- [Abrir la aplicación](https://api-4-mate-code-spa.vercel.app/)
- [Ver el repositorio](https://github.com/mllopezc-cmd/API_4_MateCode_SPA)
