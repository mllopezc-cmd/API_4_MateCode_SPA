// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';

import {
    evaluateEmailRateLimit,
    reserveSummaryEmailQuota,
} from '../api/_emailRateLimit';

const NOW = Date.UTC(2026, 9, 21, 12, 0, 0);

function createMockDatabase(previous?: number[]) {
    const documentRef = {
        path: 'users/usuario-a/_server/summaryEmailLimit',
    };

    const transaction = {
        get: vi.fn().mockResolvedValue({
            exists: previous !== undefined,
            data: () => ({
                requestTimesMs: previous,
            }),
        }),
        set: vi.fn(),
    };

    const db = {
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                collection: vi.fn(() => ({
                    doc: vi.fn(() => documentRef),
                })),
            })),
        })),
        runTransaction: vi.fn(
            async (
                callback: (
                    value: typeof transaction,
                ) => Promise<unknown>,
            ) => callback(transaction),
        ),
    } as unknown as Firestore;

    return { db, transaction, documentRef };
}

describe('Límite de frecuencia de correos', () => {
    it('permite la primera solicitud', () => {
        expect(
            evaluateEmailRateLimit([], NOW),
        ).toEqual({ allowed: true });
    });

    it('impide repetir el envío antes de 10 minutos', () => {
        const result = evaluateEmailRateLimit(
            [NOW - 60_000],
            NOW,
        );

        expect(result).toEqual({
            allowed: false,
            retryAfterSeconds: 540,
        });
    });

    it('permite solicitar después de 10 minutos', () => {
        expect(
            evaluateEmailRateLimit(
                [NOW - 600_000],
                NOW,
            ),
        ).toEqual({ allowed: true });
    });

    it('impide superar cinco solicitudes en 24 horas', () => {
        const timestamps = [
            NOW - 23 * 3_600_000,
            NOW - 18 * 3_600_000,
            NOW - 12 * 3_600_000,
            NOW - 6 * 3_600_000,
            NOW - 3_600_000,
        ];

        const result = evaluateEmailRateLimit(
            timestamps,
            NOW,
        );

        expect(result).toEqual({
            allowed: false,
            retryAfterSeconds: 3600,
        });
    });

    it('descarta solicitudes fuera de las últimas 24 horas', () => {
        const result = evaluateEmailRateLimit(
            [NOW - 25 * 3_600_000],
            NOW,
        );

        expect(result).toEqual({ allowed: true });
    });

    it('registra una solicitud autorizada mediante transacción', async () => {
        const { db, transaction, documentRef } =
            createMockDatabase();

        const result = await reserveSummaryEmailQuota(
            db,
            'usuario-a',
            NOW,
        );

        expect(result).toEqual({ allowed: true });
        expect(transaction.set).toHaveBeenCalledWith(
            documentRef,
            {
                requestTimesMs: [NOW],
            },
        );
    });

    it('no escribe cuando el límite está activo', async () => {
        const { db, transaction } =
            createMockDatabase([NOW - 60_000]);

        const result = await reserveSummaryEmailQuota(
            db,
            'usuario-a',
            NOW,
        );

        expect(result.allowed).toBe(false);
        expect(transaction.set).not.toHaveBeenCalled();
    });

    it('rechaza identificadores de usuario vacíos', async () => {
        const { db, transaction } =
            createMockDatabase();

        await expect(
            reserveSummaryEmailQuota(db, '', NOW),
        ).rejects.toThrow('INVALID_RATE_LIMIT_INPUT');

        expect(transaction.get).not.toHaveBeenCalled();
    });
});
