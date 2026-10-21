import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    deleteApp,
    initializeApp,
    type App,
} from 'firebase-admin/app';

import {
    getFirestore,
    type Firestore,
} from 'firebase-admin/firestore';

import {
    reserveSummaryEmailQuota,
} from '../api/_emailRateLimit';

const PROJECT_ID = 'demo-matecode-email-quota';
const NOW = Date.UTC(2026, 9, 21, 12, 0, 0);

let app: App | undefined;
let db: Firestore;

function quotaDocument(uid: string) {
    return db
        .collection('users')
        .doc(uid)
        .collection('_server')
        .doc('summaryEmailLimit');
}

describe('Límites de correo con Firestore Emulator', () => {
    beforeAll(() => {
        if (
            process.env.FIRESTORE_EMULATOR_HOST !==
            '127.0.0.1:8080'
        ) {
            throw new Error(
                'Estas pruebas requieren Firestore Emulator en 127.0.0.1:8080.',
            );
        }

        app = initializeApp(
            { projectId: PROJECT_ID },
            'matecode-email-quota-tests',
        );

        db = getFirestore(app);
    });

    beforeEach(async () => {
        await Promise.all([
            quotaDocument('usuario-a').delete(),
            quotaDocument('usuario-b').delete(),
        ]);
    });

    afterAll(async () => {
        if (app) {
            await deleteApp(app);
        }
    });

    it('crea el documento en la primera solicitud', async () => {
        const result = await reserveSummaryEmailQuota(
            db,
            'usuario-a',
            NOW,
        );

        expect(result).toEqual({ allowed: true });

        const snapshot =
            await quotaDocument('usuario-a').get();

        expect(snapshot.exists).toBe(true);
        expect(snapshot.data()?.requestTimesMs)
            .toEqual([NOW]);
    });

    it('rechaza una segunda solicitud inmediata', async () => {
        await reserveSummaryEmailQuota(
            db,
            'usuario-a',
            NOW,
        );

        const result = await reserveSummaryEmailQuota(
            db,
            'usuario-a',
            NOW + 60_000,
        );

        expect(result).toEqual({
            allowed: false,
            retryAfterSeconds: 540,
        });

        const snapshot =
            await quotaDocument('usuario-a').get();

        expect(snapshot.data()?.requestTimesMs)
            .toEqual([NOW]);
    });

    it('permite otra solicitud después de diez minutos', async () => {
        await reserveSummaryEmailQuota(
            db,
            'usuario-a',
            NOW,
        );

        const result = await reserveSummaryEmailQuota(
            db,
            'usuario-a',
            NOW + 600_000,
        );

        expect(result).toEqual({ allowed: true });

        const snapshot =
            await quotaDocument('usuario-a').get();

        expect(snapshot.data()?.requestTimesMs)
            .toEqual([NOW, NOW + 600_000]);
    });

    it('rechaza superar cinco solicitudes en 24 horas', async () => {
        const previous = [
            NOW - 23 * 3_600_000,
            NOW - 18 * 3_600_000,
            NOW - 12 * 3_600_000,
            NOW - 6 * 3_600_000,
            NOW - 3_600_000,
        ];

        await quotaDocument('usuario-a').set({
            requestTimesMs: previous,
        });

        const result = await reserveSummaryEmailQuota(
            db,
            'usuario-a',
            NOW,
        );

        expect(result).toEqual({
            allowed: false,
            retryAfterSeconds: 3600,
        });

        const snapshot =
            await quotaDocument('usuario-a').get();

        expect(snapshot.data()?.requestTimesMs)
            .toEqual(previous);
    });

    it('autoriza solo una de dos solicitudes simultáneas', async () => {
        const results = await Promise.all([
            reserveSummaryEmailQuota(
                db,
                'usuario-a',
                NOW,
            ),
            reserveSummaryEmailQuota(
                db,
                'usuario-a',
                NOW,
            ),
        ]);

        expect(
            results.filter((result) => result.allowed),
        ).toHaveLength(1);

        expect(
            results.filter((result) => !result.allowed),
        ).toHaveLength(1);

        const snapshot =
            await quotaDocument('usuario-a').get();

        expect(snapshot.data()?.requestTimesMs)
            .toEqual([NOW]);
    });

    it('mantiene cuotas independientes por usuario', async () => {
        const resultA = await reserveSummaryEmailQuota(
            db,
            'usuario-a',
            NOW,
        );

        const resultB = await reserveSummaryEmailQuota(
            db,
            'usuario-b',
            NOW,
        );

        expect(resultA.allowed).toBe(true);
        expect(resultB.allowed).toBe(true);

        const [documentA, documentB] =
            await Promise.all([
                quotaDocument('usuario-a').get(),
                quotaDocument('usuario-b').get(),
            ]);

        expect(documentA.exists).toBe(true);
        expect(documentB.exists).toBe(true);
    });

    it('rechaza registros de cuota dañados', async () => {
        await quotaDocument('usuario-a').set({
            requestTimesMs: 'datos-invalidos',
        });

        await expect(
            reserveSummaryEmailQuota(
                db,
                'usuario-a',
                NOW,
            ),
        ).rejects.toThrow(
            'INVALID_RATE_LIMIT_DATA',
        );
    });
});
