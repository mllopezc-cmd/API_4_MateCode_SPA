import { afterEach, beforeEach, describe, expect, it, vi, } from 'vitest';

import { getTasks, saveTasks } from '../src/services/taskStorage';
import type { Task } from '../src/types/task';

function makeTask(overrides: Partial<Task> = {}): Task {
    const timestamp = '2026-01-01T10:00:00.000Z';

    return {
        id: crypto.randomUUID(),
        title: 'Tarea de prueba',
        description: '',
        status: 'pendiente',
        createdAt: timestamp,
        updatedAt: timestamp,
        dueDate: null,
        startDate: null,
        ...overrides,
    };
}

describe('Almacenamiento local de tareas', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        localStorage.clear();
    });

    it('devuelve un arreglo vacío si no existen tareas guardadas', () => {
        expect(getTasks()).toEqual([]);
    });

    it('guarda y recupera las tareas', () => {
        const task = makeTask({ title: 'Estudiar TypeScript' });

        saveTasks([task]);

        expect(getTasks()).toEqual([task]);
    });

    it('recupera tareas antiguas que contienen priority', () => {
        const task = makeTask({ title: 'Tarea heredada' });
        const legacyTask = { ...task, priority: 'alta' };
        const storedData = JSON.stringify([legacyTask]);

        localStorage.setItem('matecode-tasks', storedData);

        const recoveredTasks = getTasks();

        expect(recoveredTasks).toHaveLength(1);
        expect(recoveredTasks[0]?.title).toBe('Tarea heredada');
        expect(recoveredTasks[0]).not.toHaveProperty('priority');

        // La lectura no modifica destructivamente el JSON original.
        expect(localStorage.getItem('matecode-tasks')).toBe(storedData);
    });

    it('elimina priority heredada cuando se guardan nuevamente las tareas', () => {
        const task = makeTask({ title: 'Tarea heredada' });
        const legacyTask = { ...task, priority: 'media' };

        saveTasks([legacyTask]);

        const storedData = localStorage.getItem('matecode-tasks');

        expect(storedData).not.toBeNull();
        expect(storedData).not.toContain('"priority"');
        expect(getTasks()[0]?.title).toBe('Tarea heredada');
    });

    it('detecta el JSON corrupto y conserva los datos originales', () => {
        const corruptedData = '{datos inválidos';

        localStorage.setItem('matecode-tasks', corruptedData);

        expect(() => getTasks()).toThrow(
            'Los datos guardados de las tareas están dañados.',
        );

        expect(localStorage.getItem('matecode-tasks')).toBe(corruptedData);
    });

    it('detecta registros inválidos sin modificar las tareas guardadas', () => {
        const validTask = makeTask({ title: 'Tarea válida' });

        const storedData = JSON.stringify([
            validTask,
            { id: 'incompleta' },
        ]);

        localStorage.setItem('matecode-tasks', storedData);

        expect(() => getTasks()).toThrow(
            'Hay tareas guardadas con datos inválidos.',
        );

        expect(localStorage.getItem('matecode-tasks')).toBe(storedData);
    });

    it('rechaza títulos vacíos o compuestos únicamente por espacios al leer', () => {
        const validTask = makeTask({ title: 'Tarea válida' });
        const blankTitleTask = makeTask({
            title: '   ',
        });

        const storedData = JSON.stringify([
            validTask,
            blankTitleTask,
        ]);

        localStorage.setItem('matecode-tasks', storedData);

        expect(() => getTasks()).toThrow(
            'Hay tareas guardadas con datos inválidos.',
        );

        // Los datos originales deben conservarse ante el error.
        expect(localStorage.getItem('matecode-tasks')).toBe(storedData);
    });

    it('acepta títulos no vacíos aunque incumplan reglas de negocio', () => {
        const shortTitleTask = makeTask({
            id: crypto.randomUUID(),
            title: 'AB',
        });

        const nonAlphanumericTitleTask = makeTask({
            id: crypto.randomUUID(),
            title: '!!!',
        });

        const storedData = JSON.stringify([
            shortTitleTask,
            nonAlphanumericTitleTask,
        ]);

        localStorage.setItem('matecode-tasks', storedData);

        expect(getTasks()).toEqual([
            shortTitleTask,
            nonAlphanumericTitleTask,
        ]);
    });

    it('detecta un contenido que no sea un arreglo y conserva los datos', () => {
        const storedData = JSON.stringify({
            title: 'No es un arreglo',
        });

        localStorage.setItem('matecode-tasks', storedData);

        expect(() => getTasks()).toThrow(
            'El almacenamiento de tareas tiene un formato inesperado.',
        );

        expect(localStorage.getItem('matecode-tasks')).toBe(storedData);
    });

    it('conserva varias tareas independientes', () => {
        const firstTask = makeTask({ title: 'Primera tarea' });
        const secondTask = makeTask({ title: 'Segunda tarea' });

        saveTasks([firstTask, secondTask]);

        const tasks: Task[] = getTasks();

        expect(tasks).toHaveLength(2);
        expect(tasks.map((task) => task.title)).toEqual([
            'Primera tarea',
            'Segunda tarea',
        ]);
        expect(tasks[0]?.id).not.toBe(tasks[1]?.id);
    });

    it('rechaza identificadores duplicados al guardar y conserva el almacenamiento previo', () => {
        const task = makeTask({ title: 'Tarea original' });
        const storedData = JSON.stringify([task]);

        localStorage.setItem('matecode-tasks', storedData);

        expect(() => saveTasks([task, { ...task }])).toThrow(
            'No se guardaron las tareas porque la lista contiene identificadores duplicados.',
        );

        expect(localStorage.getItem('matecode-tasks')).toBe(storedData);
    });

    it('rechaza identificadores duplicados al leer sin modificar los datos', () => {
        const task = makeTask({ title: 'Tarea original' });
        const storedData = JSON.stringify([task, { ...task }]);

        localStorage.setItem('matecode-tasks', storedData);

        expect(() => getTasks()).toThrow(
            'Hay tareas guardadas con identificadores duplicados.',
        );

        expect(localStorage.getItem('matecode-tasks')).toBe(storedData);
    });

    it('mantiene la lectura de fechas históricas interpretables por Date.parse', () => {
        const task = makeTask({ title: 'Tarea histórica' });
        const historicalTask = {
            ...task,
            createdAt: '2026-01-01',
            updatedAt: 'January 2, 2026',
        };

        localStorage.setItem(
            'matecode-tasks',
            JSON.stringify([historicalTask]),
        );

        expect(getTasks()).toEqual([historicalTask]);
    });

    it('normaliza tareas antiguas sin startDate', () => {
        const task = makeTask();
        const legacyTask = { ...task };
        delete (legacyTask as Partial<Task>).startDate;

        const storedData = JSON.stringify([legacyTask]);
        localStorage.setItem('matecode-tasks', storedData);

        expect(getTasks()[0]?.startDate).toBeNull();

        // La lectura no reescribe el registro original.
        expect(localStorage.getItem('matecode-tasks')).toBe(storedData);
    });

    it('rechaza una fecha de inicio inválida sin modificar los datos', () => {
        const task = makeTask();
        const storedData = JSON.stringify([
            { ...task, startDate: '2026-02-30' },
        ]);

        localStorage.setItem('matecode-tasks', storedData);

        expect(() => getTasks()).toThrow(
            'Hay tareas guardadas con datos inválidos.',
        );
        expect(localStorage.getItem('matecode-tasks')).toBe(storedData);
    });

    it('rechaza fechas guardadas cuando el inicio es posterior al límite', () => {
        const task = makeTask({
            startDate: '2026-01-10',
            dueDate: '2026-01-20',
        });

        const storedData = JSON.stringify([
            { ...task, startDate: '2026-01-21' },
        ]);

        localStorage.setItem('matecode-tasks', storedData);

        expect(() => getTasks()).toThrow(
            'Hay tareas guardadas con datos inválidos.',
        );
        expect(localStorage.getItem('matecode-tasks')).toBe(storedData);
    });

    it('falla al leer si getItem lanza una excepción', () => {
        const cause = new Error('Storage unavailable');

        vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
            throw cause;
        });

        let thrown: unknown;

        try {
            getTasks();
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toMatchObject({
            message: 'No se pudieron leer las tareas del almacenamiento local.',
            cause,
        });
    });

    it('falla al guardar si setItem lanza una excepción', () => {
        const originalTask = makeTask({ title: 'Tarea original' });
        const storedData = JSON.stringify([originalTask]);

        localStorage.setItem('matecode-tasks', storedData);

        const cause = new Error('Quota exceeded');

        vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
            throw cause;
        });

        let thrown: unknown;

        try {
            saveTasks([makeTask({ title: 'Tarea nueva' })]);
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toMatchObject({
            message:
                'No se pudieron guardar las tareas. Comprueba el almacenamiento disponible en el navegador.',
            cause,
        });

        expect(localStorage.getItem('matecode-tasks')).toBe(storedData);
        expect(getTasks()).toEqual([originalTask]);
    });

    it('no escribe si falla la serialización', () => {
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
        const cause = new Error('Serialization failed');

        vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
            throw cause;
        });

        let thrown: unknown;

        try {
            saveTasks([makeTask()]);
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toMatchObject({
            message: 'No se pudieron preparar las tareas para guardarlas.',
            cause,
        });

        expect(setItemSpy).not.toHaveBeenCalled();
        expect(localStorage.getItem('matecode-tasks')).toBeNull();
    });
});
