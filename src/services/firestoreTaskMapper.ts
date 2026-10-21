import { Timestamp } from 'firebase/firestore/lite';

import type {
    CreateTaskInput,
    Task,
    TaskStatus,
    UpdateTaskInput,
} from '../types/task';

const VALID_STATUSES: TaskStatus[] = [
    'pendiente',
    'en_progreso',
    'completada',
];

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

const ALLOWED_TASK_TEXT = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .,;:!?¿¡"()/_+#%&@-]+$/u;
const TASK_TEXT_CONTENT = /[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]/u;

export type FirestoreTaskData = {
    title: string;
    description: string;
    status: TaskStatus;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    startDate: Timestamp | null;
    dueDate: Timestamp | null;
};

export class FirestoreTaskDataError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FirestoreTaskDataError';
    }
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    );
}

function isValidCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );

}

function validateTitle(value: unknown): asserts value is string {
    if (
        typeof value !== 'string' ||
        value.trim().length < 3 ||
        value.trim().length > MAX_TITLE_LENGTH ||
        !ALLOWED_TASK_TEXT.test(value.trim()) ||
        !TASK_TEXT_CONTENT.test(value.trim())
    ) {
        throw new FirestoreTaskDataError(
            'El título debe tener entre 3 y 200 caracteres y contener letras o números permitidos.',
        );
    }
}

function validateDescription(
    value: unknown,
): asserts value is string {
    if (
        typeof value !== 'string' ||
        value.length > MAX_DESCRIPTION_LENGTH ||
        (
            value !== '' &&
            (
                value.trim().length < 3 ||
                !ALLOWED_TASK_TEXT.test(value.trim()) ||
                !TASK_TEXT_CONTENT.test(value.trim())
            )
        )
    ) {
        throw new FirestoreTaskDataError(
            'La descripción no tiene un formato válido.',
        );
    }
}

function validateStatus(value: unknown): asserts value is TaskStatus {
    if (
        typeof value !== 'string' ||
        !VALID_STATUSES.includes(value as TaskStatus)
    ) {
        throw new FirestoreTaskDataError(
            'El estado de la tarea no es válido.',
        );
    }
}

function validateCalendarDate(
    value: unknown,
    field: string,
): asserts value is string | null {
    if (
        value !== null &&
        (
            typeof value !== 'string' ||
            !isValidCalendarDate(value)
        )
    ) {
        throw new FirestoreTaskDataError(
            `El campo ${field} debe ser una fecha válida YYYY-MM-DD o null`
        );
    }
}

function getUtcDateString(now: Date = new Date()): string {
    return now.toISOString().slice(0, 10);
}

function validateDateRange(
    startDate: string | null,
    dueDate: string | null,
): void {
    if (
        startDate !== null &&
        dueDate !== null &&
        dueDate < startDate
    ) {
        throw new FirestoreTaskDataError(
            'La fecha límite debe ser igual o posterior a la fecha de inicio.',
        );
    }
}

function toFirestoreDate(value: string | null): Timestamp | null {
    if (value === null) {
        return null;
    }

    if (!isValidCalendarDate(value)) {
        throw new FirestoreTaskDataError(
            'La fecha de la tarea no es válida.',
        );
    }

    const [year, month, day] = value.split('-').map(Number);

    return Timestamp.fromDate(
        new Date(Date.UTC(year, month - 1, day)),
    );
}

// Firestore completo y Firestore Lite pueden devolver instancias
// Timestamp de constructores distintos. No aceptar objetos arbitrarios.
function isFirestoreTimestamp(
    value: unknown,
): value is Timestamp {
    return value instanceof Timestamp;
}


function fromFirestoreDate(
    value: unknown,
    field: string,
): string | null {
    if (value === null) {
        return null;
    }

    if (!isFirestoreTimestamp(value)) {
        throw new FirestoreTaskDataError(
            `El campo ${field} debe ser un Timestamp o null.`,
        );
    }

    const date = value.toDate();

    if (
        date.getUTCHours() !== 0 ||
        date.getUTCMinutes() !== 0 ||
        date.getUTCSeconds() !== 0 ||
        date.getUTCMilliseconds() !== 0
    ) {
        throw new FirestoreTaskDataError(
            `El campo ${field} debe representar una fecha a medianoche UTC.`,
        );
    }

    return date.toISOString().slice(0, 10);

}

function validateTaskFields(
    input: {
        title: unknown;
        description: unknown;
        status: unknown;
        startDate: unknown;
        dueDate: unknown;
    },
): asserts input is {
    title: string;
    description: string;
    status: TaskStatus;
    startDate: string | null;
    dueDate: string | null;
} {
    validateTitle(input.title);
    validateDescription(input.description);
    validateStatus(input.status);
    validateCalendarDate(input.startDate, 'startDate');
    validateCalendarDate(input.dueDate, 'dueDate');

    validateDateRange(input.startDate, input.dueDate);
}

export function validateFirestoreTaskInput(
    input: CreateTaskInput | UpdateTaskInput,
): void {
    if (!isRecord(input)) {
        throw new FirestoreTaskDataError(
            'Los datos de la tarea no son válidos.',
        );
    }

    const allowedKeys = new Set([
        'title',
        'description',
        'status',
        'startDate',
        'dueDate',
    ]);

    if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
        throw new FirestoreTaskDataError(
            'La tarea contiene campos no permitidos.',
        );
    }

    if (
        !Object.values(input).some((value) => value !== undefined)
    ) {
        throw new FirestoreTaskDataError(
            'Debes proporcionar al menos un campo para actualizar.',
        );
    }

    if ('title' in input && input.title !== undefined) {
        validateTitle(input.title);
    }

    if ('description' in input && input.description !== undefined) {
        validateDescription(input.description);
    }

    if ('status' in input && input.status !== undefined) {
        validateStatus(input.status);
    }

    if ('startDate' in input && input.startDate !== undefined) {
        validateCalendarDate(input.startDate, 'startDate');
    }

    if ('dueDate' in input && input.dueDate !== undefined) {
        validateCalendarDate(input.dueDate, 'dueDate');
    }
}

export function normalizeFirestoreTaskPatch(
    patch: UpdateTaskInput,
): UpdateTaskInput {
    validateFirestoreTaskInput(patch);

    const normalized: UpdateTaskInput = { ...patch };

    if (normalized.title !== undefined) {
        normalized.title = normalized.title.trim();
    }

    if (normalized.description !== undefined) {
        normalized.description = normalized.description.trim();
    }

    return normalized;
}

export function validateUpdatedFirestoreTaskData(
    current: Pick<
        Task,
        'title' | 'description' | 'status' | 'startDate' | 'dueDate'
    >,
    patch: UpdateTaskInput,
): void {
    patch = normalizeFirestoreTaskPatch(patch);

    const merged = {
        title: patch.title ?? current.title,
        description: patch.description ?? current.description,
        status: patch.status ?? current.status,
        startDate: patch.startDate !== undefined
            ? patch.startDate
            : current.startDate,
        dueDate: patch.dueDate !== undefined
            ? patch.dueDate
            : current.dueDate,
    };

    validateTaskFields(merged);

    if (
        patch.startDate !== undefined &&
        patch.startDate !== null &&
        patch.startDate !== current.startDate &&
        patch.startDate < getUtcDateString()
    ) {
        throw new FirestoreTaskDataError(
            'La fecha de inicio debe ser hoy o una fecha futura UTC.',
        );
    }
}

export function toFirestoreTaskData(
    input: CreateTaskInput,
): Omit<FirestoreTaskData, 'createdAt' | 'updatedAt'> {
    validateFirestoreTaskInput(input);

    const normalized = {
        title: input.title.trim(),
        description: input.description === undefined
            ? ''
            : input.description.trim(),
        status: input.status ?? 'pendiente',
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
    };

    validateTaskFields(normalized);

    if (
        normalized.startDate !== null &&
        normalized.startDate < getUtcDateString()
    ) {
        throw new FirestoreTaskDataError(
            'La fecha de inicio debe ser hoy o una fecha futura UTC.',
        );
    }

    return {
        ...normalized,
        startDate: toFirestoreDate(normalized.startDate),
        dueDate: toFirestoreDate(normalized.dueDate),
    };

}

export function fromFirestoreTaskData(
    id: string,
    value: unknown,
): Task {
    if (!id.trim() || !isRecord(value)) {
        throw new FirestoreTaskDataError(
            'El documento de tarea no es válido.',
        );
    }

    const expectedKeys = [
        'title',
        'description',
        'status',
        'createdAt',
        'updatedAt',
        'startDate',
        'dueDate',
    ];

    if (
        Object.keys(value).length !== expectedKeys.length ||
        expectedKeys.some((key) => !(key in value))
    ) {
        throw new FirestoreTaskDataError(
            'El documento contiene campos ausentes o adicionales.',
        );
    }

    const data = {
        title: value.title,
        description: value.description,
        status: value.status,
        startDate: fromFirestoreDate(value.startDate, 'startDate'),
        dueDate: fromFirestoreDate(value.dueDate, 'dueDate'),
    };

    validateTaskFields(data);

    if (
        !isFirestoreTimestamp(value.createdAt) ||
        !isFirestoreTimestamp(value.updatedAt)
    ) {
        throw new FirestoreTaskDataError(
            'Las marcas temporales del documento no son válidas.',
        );
    }

    return {
        id,
        title: data.title,
        description: data.description,
        status: data.status,
        createdAt: value.createdAt.toDate().toISOString(),
        updatedAt: value.updatedAt.toDate().toISOString(),
        startDate: data.startDate,
        dueDate: data.dueDate,
    };
}