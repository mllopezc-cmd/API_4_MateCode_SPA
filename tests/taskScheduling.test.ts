import { describe, expect, it } from 'vitest';
import {
    getAutomaticPriority,
    getDaysUntilDue,
    getDueDateStatus,
} from '../src/utils/taskScheduling';
import type { Task } from '../src/types/task';

const REFERENCE_DATE = new Date(2026, 4, 15, 12, 0, 0);

function createTaskForScheduling(
    dueDate: string | null,
    status: Task['status'] = 'pendiente',
): Pick<Task, 'status' | 'dueDate'> {
    return { dueDate, status };
}

describe('Cálculo de días restantes', () => {
    it('calcula correctamente los días respecto al calendario local', () => {
        expect(getDaysUntilDue('2026-05-15', REFERENCE_DATE)).toBe(0);
        expect(getDaysUntilDue('2026-05-20', REFERENCE_DATE)).toBe(5);
        expect(getDaysUntilDue('2026-05-14', REFERENCE_DATE)).toBe(-1);
    });

    it('devuelve null cuando la tarea no tiene fecha límite', () => {
        expect(getDaysUntilDue(null, REFERENCE_DATE)).toBeNull();
    });

    it('calcula correctamente el cambio de mes y de año', () => {
        const endOfYear = new Date(2026, 11, 31, 12, 0, 0);

        expect(getDaysUntilDue('2027-01-01', endOfYear)).toBe(1);
        expect(getDaysUntilDue('2027-01-02', endOfYear)).toBe(2);
        expect(getDaysUntilDue('2026-12-30', endOfYear)).toBe(-1);
    });

    it('calcula correctamente las fechas de un año bisiesto', () => {
        const beforeLeapDay = new Date(2028, 1, 28, 12, 0, 0);
        const afterLeapDay = new Date(2028, 2, 1, 12, 0, 0);

        expect(getDaysUntilDue('2028-02-29', beforeLeapDay)).toBe(1);
        expect(getDaysUntilDue('2028-03-01', beforeLeapDay)).toBe(2);
        expect(getDaysUntilDue('2028-02-29', afterLeapDay)).toBe(-1);
    });
});

describe('Prioridad automática', () => {
    it('asigna prioridad alta hasta 5 días antes del vencimiento', () => {
        expect(
            getAutomaticPriority(
                createTaskForScheduling('2026-05-15'),
                REFERENCE_DATE,
            ),
        ).toBe('alta');

        expect(
            getAutomaticPriority(
                createTaskForScheduling('2026-05-20'),
                REFERENCE_DATE,
            ),
        ).toBe('alta');
    });

    it('asigna prioridad media entre 6 y 10 días', () => {
        expect(
            getAutomaticPriority(
                createTaskForScheduling('2026-05-21'),
                REFERENCE_DATE,
            ),
        ).toBe('media');

        expect(
            getAutomaticPriority(
                createTaskForScheduling('2026-05-25'),
                REFERENCE_DATE,
            ),
        ).toBe('media');
    });

    it('asigna prioridad baja a partir de 11 días', () => {
        expect(
            getAutomaticPriority(
                createTaskForScheduling('2026-05-26'),
                REFERENCE_DATE,
            ),
        ).toBe('baja');
    });

    it('no asigna prioridad a tareas vencidas, sin fecha o completadas', () => {
        expect(
            getAutomaticPriority(
                createTaskForScheduling('2026-05-14'),
                REFERENCE_DATE,
            ),
        ).toBeNull();

        expect(
            getAutomaticPriority(
                createTaskForScheduling(null),
                REFERENCE_DATE,
            ),
        ).toBeNull();

        expect(
            getAutomaticPriority(
                createTaskForScheduling('2026-05-16', 'completada'),
                REFERENCE_DATE,
            ),
        ).toBeNull();
    });
});

describe('Estado de vencimiento', () => {
    it('marca como vencidas las tareas con fecha anterior a hoy', () => {
        expect(
            getDueDateStatus(
                createTaskForScheduling('2026-05-14'),
                REFERENCE_DATE,
            ),
        ).toBe('vencida');
    });

    it('marca como próximas a vencer las tareas de hoy a 5 días', () => {
        expect(
            getDueDateStatus(
                createTaskForScheduling('2026-05-15'),
                REFERENCE_DATE,
            ),
        ).toBe('por-vencer');

        expect(
            getDueDateStatus(
                createTaskForScheduling('2026-05-20'),
                REFERENCE_DATE,
            ),
        ).toBe('por-vencer');
    });

    it('marca como normal una tarea cuya fecha límite está a 6 días', () => {
        expect(
            getDueDateStatus(
                createTaskForScheduling('2026-05-21'),
                REFERENCE_DATE,
            ),
        ).toBe('normal');
    });

    it('no marca como vencidas las tareas sin fecha límite', () => {
        expect(
            getDueDateStatus(
                createTaskForScheduling(null),
                REFERENCE_DATE,
            ),
        ).toBe('normal');
    });

    it('prioriza el estado completada sobre la fecha límite', () => {
        expect(
            getDueDateStatus(
                createTaskForScheduling('2026-05-14', 'completada'),
                REFERENCE_DATE,
            ),
        ).toBe('completada');
    });
});