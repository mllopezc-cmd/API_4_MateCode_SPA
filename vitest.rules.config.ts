import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['rules-tests/*.emulator.ts'],
        environment: 'node',
        clearMocks: true,
    },
});