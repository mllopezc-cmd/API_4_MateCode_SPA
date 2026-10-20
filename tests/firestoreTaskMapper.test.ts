import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import {
    FirestoreTaskDataError,
    fromFirestoreTaskData,
    normalizeFirestoreTaskPatch,
    toFirestoreTaskData,
    validateFirestoreTaskInput,
    validateUpdatedFirestoreTaskData,
} from '../src/services/firestoreTaskMapper';

const validTask = {
    title: 'Preparar examen',
    description: 'Repasar los temas del curso',
    status: 'pendiente' as const,
    startDate: '2024-02-29',
    dueDate: '2024-03-15',
};

const validDocument = {
    ...validTask,
    startDate:
        validTask.startDate === null
            ? null
            : Timestamp.fromDate(
                new Date(`${validTask.startDate}T00:00:00.000Z`),
            ),
    dueDate:
        validTask.dueDate === null
            ? null
            : Timestamp.fromDate(
                new Date(`${validTask.dueDate}T00:00:00.000Z`),
            ),
    createdAt: Timestamp.fromDate(new Date('2024-01-01T10:00:00.000Z')),
    updatedAt: Timestamp.fromDate(new Date('2024-01-02T10:00:00.000Z')),
};

describe('toFirestoreTaskData', () => {
    it('normaliza los valores opcionales al crear una tarea', () => {
        expect(
            toFirestoreTaskData({
                title: '  Preparar examen  ',
            }),
        ).toEqual({
            title: 'Preparar examen',
            description: '',
            status: 'pendiente',
            startDate: null,
            dueDate: null,
        });
    });

    it('recorta los espacios exteriores del título y la descripción', () => {
        expect(
            toFirestoreTaskData({
                title: '  Preparar examen  ',
                description: '  Repasar los temas del curso  ',
            }),
        ).toMatchObject({
            title: 'Preparar examen',
            description: 'Repasar los temas del curso',
        });
    });

    it('rechaza fechas inválidas', () => {
        const invalidDates = [
            '2023-02-29',
            '2024-02-30',
            '2024-13-01',
            '2024-00-10',
            '2024-1-01',
            '29-02-2024',
            '',
        ];

        for (const startDate of invalidDates) {
            expect(() =>
                toFirestoreTaskData({
                    title: 'Tarea válida',
                    startDate,
                }),
            ).toThrow(FirestoreTaskDataError);
        }
    });

    it('acepta fechas nulas', () => {
        expect(
            toFirestoreTaskData({
                title: 'Tarea válida',
                startDate: null,
                dueDate: null,
            }),
        ).toMatchObject({
            startDate: null,
            dueDate: null,
        });
    });

    it('rechaza una fecha límite anterior a la fecha de inicio', () => {
        expect(() =>
            toFirestoreTaskData({
                title: 'Tarea válida',
                startDate: '2024-05-20',
                dueDate: '2024-05-19',
            }),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza títulos demasiado cortos o demasiado largos', () => {
        expect(() =>
            toFirestoreTaskData({ title: 'ab' }),
        ).toThrow(FirestoreTaskDataError);

        expect(() =>
            toFirestoreTaskData({ title: 'a'.repeat(201) }),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza descripciones demasiado largas', () => {
        expect(() =>
            toFirestoreTaskData({
                title: 'Tarea válida',
                description: 'a'.repeat(5001),
            }),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza estados desconocidos', () => {
        expect(() =>
            toFirestoreTaskData({
                title: 'Tarea válida',
                status: 'cancelada' as never,
            }),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza una fecha de inicio pasada al crear una tarea', () => {
        expect(() =>
            toFirestoreTaskData({
                title: 'Tarea válida',
                startDate: '2000-01-01',
            }),
        ).toThrow(
            'La fecha de inicio debe ser hoy o una fecha futura UTC.',
        );
    });
});

describe('validateFirestoreTaskInput', () => {
    it('acepta un parche parcial válido', () => {
        expect(() =>
            validateFirestoreTaskInput({
                title: 'Nuevo título',
            }),
        ).not.toThrow();
    });

    it('acepta una fecha válida de año bisiesto', () => {
        expect(() =>
            validateFirestoreTaskInput({
                startDate: '2024-02-29',
            }),
        ).not.toThrow();
    });

    it('rechaza parches vacíos', () => {
        expect(() =>
            validateFirestoreTaskInput({}),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza campos no permitidos', () => {
        expect(() =>
            validateFirestoreTaskInput({
                title: 'Título válido',
                ownerId: 'otro-usuario',
            } as never),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza fechas inválidas en un parche', () => {
        expect(() =>
            validateFirestoreTaskInput({
                dueDate: '2023-02-29',
            }),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza parches cuyos campos son undefined', () => {
        expect(() =>
            validateFirestoreTaskInput({
                title: undefined,
            }),
        ).toThrow(FirestoreTaskDataError);
    });
});

describe('normalizeFirestoreTaskPatch', () => {
    it('recorta los espacios exteriores del título', () => {
        expect(
            normalizeFirestoreTaskPatch({
                title: '  Título actualizado  ',
            }),
        ).toEqual({
            title: 'Título actualizado',
        });
    });

    it('recorta los espacios exteriores de la descripción', () => {
        expect(
            normalizeFirestoreTaskPatch({
                description: '  Nueva descripción  ',
            }),
        ).toEqual({
            description: 'Nueva descripción',
        });
    });

    it('rechaza una descripción compuesta solo por espacios', () => {
        expect(() =>
            normalizeFirestoreTaskPatch({
                description: '    ',
            }),
        ).toThrow(FirestoreTaskDataError);
    });

    it('conserva los campos del parche que no necesitan normalización', () => {
        expect(
            normalizeFirestoreTaskPatch({
                status: 'completada',
                startDate: null,
            }),
        ).toEqual({
            status: 'completada',
            startDate: null,
        });
    });
});

describe('fromFirestoreTaskData', () => {
    it('convierte un documento válido al modelo Task', () => {
        expect(
            fromFirestoreTaskData('task-123', validDocument),
        ).toEqual({
            id: 'task-123',
            ...validTask,
            createdAt: '2024-01-01T10:00:00.000Z',
            updatedAt: '2024-01-02T10:00:00.000Z',
        });
    });

    it('rechaza documentos con campos ausentes', () => {
        const missingStatus = { ...validDocument };
        delete (missingStatus as Partial<typeof validDocument>).status;

        expect(() =>
            fromFirestoreTaskData('task-123', missingStatus),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza documentos con campos adicionales', () => {
        expect(() =>
            fromFirestoreTaskData('task-123', {
                ...validDocument,
                priority: 'alta',
            }),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza marcas temporales que no sean Timestamp', () => {
        expect(() =>
            fromFirestoreTaskData('task-123', {
                ...validDocument,
                createdAt: '2024-01-01T10:00:00.000Z',
            }),
        ).toThrow(FirestoreTaskDataError);

        expect(() =>
            fromFirestoreTaskData('task-123', {
                ...validDocument,
                updatedAt: new Date(),
            }),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza fechas mal formadas en el documento', () => {
        expect(() =>
            fromFirestoreTaskData('task-123', {
                ...validDocument,
                startDate: '2024-02-30',
            }),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza un ID vacío', () => {
        expect(() =>
            fromFirestoreTaskData('   ', validDocument),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza un documento que no sea un objeto', () => {
        expect(() =>
            fromFirestoreTaskData('task-123', null),
        ).toThrow(FirestoreTaskDataError);
    });
});

describe('validateUpdatedFirestoreTaskData', () => {
    const current = {
        title: 'Tarea actual',
        description: 'Descripción actual',
        status: 'pendiente' as const,
        startDate: '2026-10-20',
        dueDate: '2026-10-25',
    };

    it('acepta una actualización que conserva un rango válido', () => {
        expect(() =>
            validateUpdatedFirestoreTaskData(current, {
                title: 'Título actualizado',
            }),
        ).not.toThrow();
    });

    it('rechaza una fecha de inicio posterior a la fecha límite existente', () => {
        expect(() =>
            validateUpdatedFirestoreTaskData(current, {
                startDate: '2026-10-26',
            }),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza una fecha límite anterior al inicio existente', () => {
        expect(() =>
            validateUpdatedFirestoreTaskData(current, {
                dueDate: '2026-10-19',
            }),
        ).toThrow(FirestoreTaskDataError);
    });

    it('acepta establecer la fecha de inicio en null', () => {
        expect(() =>
            validateUpdatedFirestoreTaskData(current, {
                startDate: null,
            }),
        ).not.toThrow();
    });

    it('acepta establecer la fecha límite en null', () => {
        expect(() =>
            validateUpdatedFirestoreTaskData(current, {
                dueDate: null,
            }),
        ).not.toThrow();
    });

    it('rechaza campos no permitidos', () => {
        expect(() =>
            validateUpdatedFirestoreTaskData(current, {
                title: 'Título válido',
                ownerId: 'otro-usuario',
            } as never),
        ).toThrow(FirestoreTaskDataError);
    });

    it('rechaza asignar una nueva fecha de inicio pasada', () => {
        expect(() =>
            validateUpdatedFirestoreTaskData(current, {
                startDate: '2000-01-01',
            }),
        ).toThrow(
            'La fecha de inicio debe ser hoy o una fecha futura UTC.',
        );
    });

    it('permite conservar una fecha histórica al editar otro campo', () => {
        const historicalTask = {
            ...current,
            startDate: '2000-01-01',
            dueDate: '2000-01-10',
        };

        expect(() =>
            validateUpdatedFirestoreTaskData(historicalTask, {
                title: 'Título actualizado',
            }),
        ).not.toThrow();
    });

    it('permite conservar explícitamente la fecha histórica existente', () => {
        const historicalTask = {
            ...current,
            startDate: '2000-01-01',
            dueDate: '2000-01-10',
        };

        expect(() =>
            validateUpdatedFirestoreTaskData(historicalTask, {
                startDate: '2000-01-01',
            }),
        ).not.toThrow();
    });
});
