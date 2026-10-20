# Guía de trabajo con IA para MateCode SPA

## 1. Propósito

Esta guía define cómo utilizar asistentes de IA para mantener y ampliar MateCode sin perder funcionalidades, debilitar la seguridad ni introducir cambios difíciles de revisar.

La IA debe actuar como apoyo técnico: analizar primero, explicar los cambios propuestos, implementar de forma incremental y comprobar los resultados.

## 2. Contexto que debe respetarse

MateCode utiliza React, TypeScript, Vite, React Router, Firebase Authentication y Cloud Firestore.

Antes de proponer cambios, la IA debe revisar los archivos y las pruebas relacionados con la tarea. No debe asumir que la arquitectura, los contratos o la configuración coinciden con los de otro proyecto.

La documentación de referencia es:

- `README.md`
- `docs/ARQUITECTURA.md`
- `docs/GUIA_TRABAJO_CON_IA.md`

## 3. Reglas obligatorias

1. Preservar las funcionalidades existentes y los contratos públicos.
2. No realizar refactorizaciones amplias cuando un cambio acotado sea suficiente.
3. No eliminar pruebas ni modificar sus expectativas únicamente para ocultar errores.
4. No desactivar reglas de TypeScript, ESLint o Firestore para conseguir que una validación pase.
5. No introducir dependencias sin justificar su necesidad.
6. No crear carpetas o abstracciones sin una responsabilidad concreta.
7. No mezclar la persistencia de Firestore con el almacenamiento local sin una decisión arquitectónica explícita.
8. No convertir errores de red, permisos o datos inválidos en resultados aparentemente exitosos.
9. No exponer secretos, tokens, credenciales ni valores privados en documentación, registros o mensajes.
10. No ejecutar `git commit` ni `git push` sin autorización explícita del responsable del proyecto.

## 4. Flujo de trabajo esperado

### Paso 1: comprender

- Identificar el objetivo y los criterios de aceptación.
- Revisar los archivos implicados y sus dependencias.
- Consultar las pruebas existentes.
- Detectar riesgos para autenticación, persistencia, rutas y seguridad.

### Paso 2: proponer

- Explicar qué archivos se modificarán y por qué.
- Separar cambios funcionales de cambios de estructura o documentación.
- Señalar decisiones que requieren autorización.
- Evitar cambios adicionales no relacionados con el objetivo.

### Paso 3: implementar

- Realizar cambios pequeños y coherentes.
- Mantener el estilo y los contratos del proyecto.
- Actualizar o añadir pruebas cuando cambie el comportamiento.
- Actualizar la documentación si cambian comandos, configuración o arquitectura.

### Paso 4: validar

Ejecutar las comprobaciones pertinentes:

```bash
npm test
npm run lint
npm run build
```

Para cambios de reglas o autorización de Firestore:

```bash
firebase emulators:exec --only firestore "npm run test:rules"
```

Si una validación falla, identificar la causa y corregirla antes de declarar el trabajo terminado. No afirmar que una prueba pasó si no se ejecutó.

### Paso 5: revisar y entregar

- Inspeccionar `git diff --check`.
- Revisar `git diff` y `git status --short`.
- Explicar los archivos modificados, las decisiones y los riesgos pendientes.
- Informar con precisión qué validaciones pasaron y cuáles no pudieron ejecutarse.
- Esperar autorización antes de crear commits o publicar cambios.

## 5. Reglas de seguridad

- No solicitar ni compartir contraseñas, tokens o credenciales privadas.
- No copiar archivos `.env.local` en mensajes, documentación o repositorios.
- Utilizar `.env.example` con valores ficticios o marcadores descriptivos.
- Recordar que las variables `VITE_*` son accesibles desde el cliente y no son adecuadas para secretos de servidor.
- No permitir que un usuario lea o modifique tareas pertenecientes a otro UID.
- Probar las reglas de Firestore con escenarios autorizados y no autorizados.
- No sustituir la autorización del servidor por comprobaciones exclusivas de la interfaz.

## 6. Cómo solicitar un cambio

Una solicitud de trabajo debería especificar:

- Objetivo del cambio.
- Comportamiento esperado.
- Restricciones que deben preservarse.
- Archivos o módulos conocidos, si corresponde.
- Pruebas o criterios que demostrarán que el cambio está terminado.

Si falta información esencial o existe una decisión de arquitectura con impacto importante, la IA debe detenerse y consultar antes de tomarla. Para tareas claras y acotadas, debe avanzar sin solicitar confirmaciones innecesarias.

## 7. Criterio de finalización

Un cambio está listo para revisión cuando cumple el objetivo, preserva los contratos relevantes, tiene pruebas adecuadas, supera las validaciones pertinentes y presenta un diff comprensible.

La aprobación final y la publicación del cambio corresponden al responsable del proyecto.
