import type { Firestore } from 'firebase-admin/firestore';

const COOLDOWN_MS = 10 * 60 * 1000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REQUESTS = 5;

export type EmailRateLimitResult =
    | { allowed: true }
    | {
        allowed: false;
        retryAfterSeconds: number;
    };

function recentRequests(
    timestamps: readonly number[],
    nowMs: number,
): number[] {
    return timestamps
        .filter((time) => time > nowMs - WINDOW_MS)
        .sort((a, b) => a - b);
}

export function evaluateEmailRateLimit(
    timestamps: readonly number[],
    nowMs: number,
): EmailRateLimitResult {
    const recent = recentRequests(timestamps, nowMs);
    const lastRequest = recent.at(-1);

    const cooldownRemaining =
        lastRequest === undefined
            ? 0
            : lastRequest + COOLDOWN_MS - nowMs;

    const windowRemaining =
        recent.length >= MAX_REQUESTS
            ? recent[0] + WINDOW_MS - nowMs
            : 0;

    const waitMs = Math.max(
        0,
        cooldownRemaining,
        windowRemaining,
    );

    if (waitMs > 0) {
        return {
            allowed: false,
            retryAfterSeconds: Math.ceil(waitMs / 1000),
        };
    }

    return { allowed: true };
}

export async function reserveSummaryEmailQuota(
    db: Firestore,
    uid: string,
    nowMs = Date.now(),
): Promise<EmailRateLimitResult> {
    if (!uid.trim() || !Number.isSafeInteger(nowMs) || nowMs < 0) {
        throw new Error('INVALID_RATE_LIMIT_INPUT');
    }

    const documentRef = db
        .collection('users')
        .doc(uid)
        .collection('_server')
        .doc('summaryEmailLimit');

    return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(documentRef);

        const stored: unknown = snapshot.exists
            ? snapshot.data()?.requestTimesMs
            : [];

        if (
            !Array.isArray(stored) ||
            !stored.every(
                (value: unknown) =>
                    typeof value === 'number' &&
                    Number.isSafeInteger(value) &&
                    value >= 0,
            )
        ) {
            throw new Error('INVALID_RATE_LIMIT_DATA');
        }

        const previous: number[] = stored;
        const decision = evaluateEmailRateLimit(
            previous,
            nowMs,
        );

        if (!decision.allowed) {
            return decision;
        }

        const recent = recentRequests(previous, nowMs);

        transaction.set(documentRef, {
            requestTimesMs: [...recent, nowMs],
        });

        return { allowed: true };
    });
}
