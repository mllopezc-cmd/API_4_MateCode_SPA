import { afterEach, beforeEach, describe, expect, it, vi, } from 'vitest';
import {
    addTask,
    changeTaskStatus,
    createTask,
    deleteTask,
    filterTasks,
    getAllTasks,
    updateTask,
} from '../src/services/taskService';
import { saveTasks } from '../src/services/taskStorage';
import type { Task } from '../src/types/task';

function getDateInDays(daysFromToday: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

describe('Operaciones CRUD de tareas', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('crea y guarda una tarea nueva', () => {
        const task = addTask({ title: 'Estudiar React' });

        expect(task.title).toBe('Estudiar React');
        expect(getAllTasks()).toEqual([task]);
        expect(task).not.toHaveProperty('priority');
    });

    it('conserva las tareas existentes al añadir otra', () => {
        const firstTask = addTask({ title: 'Primera tarea' });
        const secondTask = addTask({ title: 'Segunda tarea' });

        expect(getAllTasks()).toHaveLength(2);
        expect(getAllTasks().map((task) => task.id)).toContain(firstTask.id);
        expect(getAllTasks().map((task) => task.id)).toContain(secondTask.id);
    });

    it('propaga el error al añadir si falla la persistencia y conserva las tareas existentes', () => {
        addTask({ title: 'Tarea original' });
        const storedBefore = localStorage.getItem('matecode-tasks');

        vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
            throw new Error('Error simulado de almacenamiento');
        });

        expect(() => addTask({ title: 'Tarea nueva' })).toThrow(
            'No se pudieron guardar las tareas. Comprueba el almacenamiento disponible en el navegador.',
        );

        expect(localStorage.getItem('matecode-tasks')).toBe(storedBefore);
    });

    it('propaga el error al actualizar si falla la persistencia y conserva la tarea original', () => {
        const task = addTask({ title: 'Tarea original' });
        const storedBefore = localStorage.getItem('matecode-tasks');

        vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
            throw new Error('Error simulado de almacenamiento');
        });

        expect(() =>
            updateTask(task.id, { title: 'Título actualizado' }),
        ).toThrow(
            'No se pudieron guardar las tareas. Comprueba el almacenamiento disponible en el navegador.',
        );

        expect(localStorage.getItem('matecode-tasks')).toBe(storedBefore);
        expect(getAllTasks()[0]?.title).toBe('Tarea original');
    });

    it('propaga el error al eliminar si falla la persistencia y conserva la tarea original', () => {
        const task = addTask({ title: 'Tarea original' });
        const storedBefore = localStorage.getItem('matecode-tasks');

        vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
            throw new Error('Error simulado de almacenamiento');
        });

        expect(() => deleteTask(task.id)).toThrow(
            'No se pudieron guardar las tareas. Comprueba el almacenamiento disponible en el navegador.',
        );

        expect(localStorage.getItem('matecode-tasks')).toBe(storedBefore);
        expect(getAllTasks()).toEqual([task]);
    });

    it('no persiste ni cambia updatedAt cuando la actualización está vacía', () => {
        const task = addTask({ title: 'Tarea original' });
        const storedBefore = localStorage.getItem('matecode-tasks');

        const updated = updateTask(task.id, {});

        expect(updated).toEqual(task);
        expect(updated?.updatedAt).toBe(task.updatedAt);
        expect(localStorage.getItem('matecode-tasks')).toBe(storedBefore);
    });

    it('devuelve null ante una actualización vacía de un ID inexistente', () => {
        expect(updateTask('id-inexistente', {})).toBeNull();
        expect(getAllTasks()).toEqual([]);
    });

    it('ordena las tareas de más recientes a más antiguas', () => {
        const olderTask = createTask({ title: 'Tarea antigua' });
        const newerTask = createTask({ title: 'Tarea reciente' });

        saveTasks([
            { ...olderTask, createdAt: '2026-01-01T10:00:00.000Z' },
            { ...newerTask, createdAt: '2026-01-02T10:00:00.000Z' },
        ]);

        expect(getAllTasks().map((task) => task.title)).toEqual([
            'Tarea reciente',
            'Tarea antigua',
        ]);
    });

    it('actualiza una tarea sin modificar su ID ni su fecha de creación', () => {
        const task = addTask({ title: 'Título inicial' });

        const updated = updateTask(task.id, {
            title: 'Título actualizado',
            description: 'Nueva descripción',
            dueDate: getDateInDays(3),
        });

        expect(updated).not.toBeNull();
        expect(updated?.title).toBe('Título actualizado');
        expect(updated?.description).toBe('Nueva descripción');
        expect(updated?.dueDate).toBe(getDateInDays(3));
        expect(updated?.id).toBe(task.id);
        expect(updated?.createdAt).toBe(task.createdAt);
        expect(updated?.updatedAt).toBeTruthy();
        expect(updated).not.toHaveProperty('priority');
        expect(getAllTasks()[0]?.title).toBe('Título actualizado');
    });

    it('rechaza un título vacío durante la actualización', () => {
        const task = addTask({ title: 'Tarea original' });

        expect(() => updateTask(task.id, { title: '   ' })).toThrow(
            'El título de la tarea es obligatorio.',
        );

        expect(getAllTasks()[0]?.title).toBe('Tarea original');
    });

    it('rechaza una fecha límite inválida durante la actualización', () => {
        const task = addTask({ title: 'Tarea original' });

        expect(() =>
            updateTask(task.id, { dueDate: '2026-02-30' }),
        ).toThrow('La fecha límite no es válida.');

        expect(getAllTasks()[0]?.dueDate).toBeNull();
    });

    it('devuelve null al actualizar un ID inexistente', () => {
        expect(
            updateTask('id-inexistente', { title: 'Nueva tarea' }),
        ).toBeNull();

        expect(getAllTasks()).toEqual([]);
    });

    it('permite cambiar el estado en cualquier dirección', () => {
        const task = addTask({ title: 'Tarea de prueba' });

        expect(changeTaskStatus(task.id, 'en_progreso')?.status)
            .toBe('en_progreso');
        expect(changeTaskStatus(task.id, 'completada')?.status)
            .toBe('completada');
        expect(changeTaskStatus(task.id, 'pendiente')?.status)
            .toBe('pendiente');
    });

    it('elimina una tarea existente y conserva las demás', () => {
        const firstTask = addTask({ title: 'Primera tarea' });
        const secondTask = addTask({ title: 'Segunda tarea' });

        expect(deleteTask(firstTask.id)).toBe(true);
        expect(getAllTasks()).toEqual([secondTask]);
    });

    it('devuelve false al intentar eliminar un ID inexistente', () => {
        addTask({ title: 'Tarea existente' });

        expect(deleteTask('id-inexistente')).toBe(false);
        expect(getAllTasks()).toHaveLength(1);
    });

    it('rechaza títulos que superan los 200 caracteres al crear y actualizar', () => {
        expect(() =>
            createTask({ title: 'A'.repeat(201) }),
        ).toThrow(
            'El título debe tener entre 3 y 200 caracteres y contener letras o números.',
        );

        const task = addTask({ title: 'Tarea original' });

        expect(() =>
            updateTask(task.id, { title: 'A'.repeat(201) }),
        ).toThrow(
            'El título debe tener entre 3 y 200 caracteres y contener letras o números.',
        );

        expect(getAllTasks()[0]?.title).toBe('Tarea original');
    });

    it('rechaza títulos inválidos sin modificar una tarea existente', () => {
        const task = addTask({ title: 'Tarea original' });

        expect(() => updateTask(task.id, { title: 'AB' })).toThrow(
            'El título debe tener al menos 3 caracteres y contener una letra o número.',
        );

        expect(getAllTasks()[0]?.title).toBe('Tarea original');
    });

    it('rechaza descripciones compuestas únicamente por espacios', () => {
        expect(() =>
            createTask({
                title: 'Tarea válida',
                description: '   ',
            }),
        ).toThrow('La descripción no puede contener solo espacios.');
    });

    it('rechaza descripciones demasiado cortas o sin letras ni números', () => {
        expect(() =>
            createTask({
                title: 'Tarea válida',
                description: 'AB',
            }),
        ).toThrow(
            'La descripción debe tener al menos 3 caracteres y contener una letra o número.',
        );

        expect(() =>
            createTask({
                title: 'Tarea válida',
                description: '!!!',
            }),
        ).toThrow(
            'La descripción debe tener al menos 3 caracteres y contener una letra o número.',
        );
    });

    it('rechaza descripciones que superan los 5000 caracteres al crear y actualizar', () => {
        expect(() =>
            createTask({
                title: 'Tarea válida',
                description: 'A'.repeat(5001),
            }),
        ).toThrow('La descripción no tiene un formato válido.');

        const task = addTask({
            title: 'Tarea original',
            description: 'Descripción válida',
        });

        expect(() =>
            updateTask(task.id, {
                description: 'A'.repeat(5001),
            }),
        ).toThrow('La descripción no tiene un formato válido.');

        expect(getAllTasks()[0]?.description).toBe('Descripción válida');
    });

    it('permite una descripción vacía y limpia espacios exteriores', () => {
        const withoutDescription = createTask({
            title: '  Estudiar React  ',
        });

        const withDescription = createTask({
            title: 'Preparar examen',
            description: '  Repasar ejercicios  ',
        });

        expect(withoutDescription.title).toBe('Estudiar React');
        expect(withoutDescription.description).toBe('');
        expect(withDescription.description).toBe('Repasar ejercicios');
    });

    it('crea una tarea con fecha de inicio y fecha límite válidas', () => {
        const task = createTask({
            title: 'Preparar proyecto',
            startDate: getDateInDays(2),
            dueDate: getDateInDays(5),
        });

        expect(task.startDate).toBe(getDateInDays(2));
        expect(task.dueDate).toBe(getDateInDays(5));
        expect(task.status).toBe('pendiente');
    });

    it('rechaza una fecha de inicio anterior a hoy al crear', () => {
        expect(() =>
            createTask({
                title: 'Tarea programada',
                startDate: getDateInDays(-1),
            }),
        ).toThrow(
            'La fecha de inicio debe ser hoy o una fecha futura.',
        );
    });

    it('rechaza una fecha límite anterior a la fecha de inicio', () => {
        expect(() =>
            createTask({
                title: 'Tarea programada',
                startDate: getDateInDays(5),
                dueDate: getDateInDays(3),
            }),
        ).toThrow(
            'La fecha límite debe ser igual o posterior a la fecha de inicio.',
        );
    });

    it('permite actualizar ambas fechas como un único intervalo válido', () => {
        const task = addTask({ title: 'Tarea programada' });

        const updated = updateTask(task.id, {
            startDate: getDateInDays(3),
            dueDate: getDateInDays(7),
        });

        expect(updated?.startDate).toBe(getDateInDays(3));
        expect(updated?.dueDate).toBe(getDateInDays(7));
    });

    it('rechaza cambiar el límite si deja el intervalo inválido', () => {
        const task = addTask({
            title: 'Tarea programada',
            startDate: getDateInDays(3),
            dueDate: getDateInDays(7),
        });

        expect(() =>
            updateTask(task.id, { dueDate: getDateInDays(2) }),
        ).toThrow(
            'La fecha límite debe ser igual o posterior a la fecha de inicio.',
        );

        expect(getAllTasks()[0]?.dueDate).toBe(getDateInDays(7));
    });

    it('no cambia automáticamente el estado al llegar la fecha de inicio', () => {
        const task = addTask({
            title: 'Tarea programada',
            startDate: getDateInDays(0),
            dueDate: getDateInDays(5),
        });

        expect(getAllTasks()[0]?.status).toBe('pendiente');
        expect(getAllTasks()[0]?.startDate).toBe(task.startDate);
    });
});

describe('Filtros de tareas', () => {
    let tasks: Task[];

    beforeEach(() => {
        tasks = [
            createTask({
                title: 'Tarea urgente',
                status: 'pendiente',
                dueDate: getDateInDays(3),
            }),
            createTask({
                title: 'Tarea intermedia',
                status: 'en_progreso',
                dueDate: getDateInDays(8),
            }),
            createTask({
                title: 'Tarea completada',
                status: 'completada',
                dueDate: getDateInDays(3),
            }),
            createTask({
                title: 'Tarea sin fecha',
                status: 'pendiente',
            }),
        ];
    });

    it('filtra por estado', () => {
        expect(
            filterTasks(tasks, { status: 'pendiente' }).map(
                (task) => task.title,
            ),
        ).toEqual(['Tarea urgente', 'Tarea sin fecha']);
    });

    it('filtra por prioridad automática alta', () => {
        expect(
            filterTasks(tasks, { priority: 'alta' }).map(
                (task) => task.title,
            ),
        ).toEqual(['Tarea urgente']);
    });

    it('filtra por prioridad automática media', () => {
        expect(
            filterTasks(tasks, { priority: 'media' }).map(
                (task) => task.title,
            ),
        ).toEqual(['Tarea intermedia']);
    });

    it('no asigna prioridad automática a tareas completadas o sin fecha', () => {
        const highPriorityTasks = filterTasks(tasks, { priority: 'alta' });

        expect(highPriorityTasks.map((task) => task.title))
            .not.toContain('Tarea completada');
        expect(highPriorityTasks.map((task) => task.title))
            .not.toContain('Tarea sin fecha');
    });

    it('combina los filtros de estado y prioridad', () => {
        expect(
            filterTasks(tasks, {
                status: 'en_progreso',
                priority: 'media',
            }).map((task) => task.title),
        ).toEqual(['Tarea intermedia']);
    });

    it('devuelve todas las tareas si no se aplican filtros', () => {
        expect(filterTasks(tasks, {})).toHaveLength(4);
    });

    it('no modifica el arreglo original al filtrar', () => {
        const originalTitles = tasks.map((task) => task.title);

        filterTasks(tasks, { priority: 'alta' });

        expect(tasks.map((task) => task.title)).toEqual(originalTitles);
    });
});
