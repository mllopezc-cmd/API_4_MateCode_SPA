import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['rules-tests/firestoreRules.emulator.ts'],
        environment: 'node',
        clearMocks: true,
    },
});