import { defineConfig } from 'vitest/config';

/*
 * MateCode SPA
 * Etapa 8 - Bloque 4B
 *
 * Configuración adicional para validar
 * las reglas de Firestore en el emulador.
 *
 * No reemplaza vitest.rules.config.ts.
 */
export default defineConfig({
    test: {
        include: [
            'rules-tests/firestoreRules.emulator.ts',
            'rules-tests/profileContact.emulator.ts',
        ],

        environment: 'node',

        clearMocks: true,

        // Evita interferencias entre las suites
        // que comparten un mismo emulador.
        fileParallelism: false,

        testTimeout: 15000,
        hookTimeout: 30000,
    },
});
