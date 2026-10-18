import type {
    CreateTaskInput,
    Task,
    TaskFilters,
    TaskStatus,
    UpdateTaskInput,
} from '../types/task';
import {
    getAutomaticPriority,
} from '../utils/taskScheduling';
import {
    getTasks as loadTasks,
    saveTasks,
} from './taskStorage';

const VALID_STATUSES: TaskStatus[] = [
    'pendiente',
    'en_progreso',
    'completada',
];

function isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function getLocalDateString(now: Date = new Date()): string {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function validateStartDate(value: string | null): void {
    if (value !== null && !isValidDate(value)) {
        throw new Error('La fecha de inicio no es válida.');
    }
}

function validateDateRange(
    startDate: string | null,
    dueDate: string | null,
): void {
    if (startDate !== null && dueDate !== null && dueDate < startDate) {
        throw new Error(
            'La fecha límite debe ser igual o posterior a la fecha de inicio.',
        );
    }
}

function validateTitle(value: string): string {
    const title = value.trim();

    if (!title) {
        throw new Error('El título de la tarea es obligatorio.');
    }

    if (title.length < 3 || !/[\p{L}\p{N}]/u.test(title)) {
        throw new Error(
            'El título debe tener al menos 3 caracteres y contener una letra o número.',
        );
    }

    return title;
}

function validateDescription(value: string | undefined): string {
    if (value === undefined || value === '') {
        return '';
    }

    const description = value.trim();

    if (!description) {
        throw new Error('La descripción no puede contener solo espacios.');
    }

    if (description.length < 3 || !/[\p{L}\p{N}]/u.test(description)) {
        throw new Error(
            'La descripción debe tener al menos 3 caracteres y contener una letra o número.',
        );
    }

    return description;
}

function validateDueDate(value: string | null): void {
    if (value !== null && !isValidDate(value)) {
        throw new Error('La fecha límite no es válida.');
    }
}

function validateStatus(value: TaskStatus): void {
    if (!VALID_STATUSES.includes(value)) {
        throw new Error('El estado de la tarea no es válido.');
    }
}

export function createTask(input: CreateTaskInput): Task {
    const title = validateTitle(input.title);
    const description = validateDescription(input.description);


    const status = input.status ?? 'pendiente';
    const startDate = input.startDate ?? null;
    const dueDate = input.dueDate ?? null;

    validateStatus(status);
    validateStartDate(startDate);
    validateDueDate(dueDate);

    if (startDate !== null && startDate < getLocalDateString()) {
        throw new Error(
            'La fecha de inicio debe ser hoy o una fecha futura.',
        );
    }

    validateDateRange(startDate, dueDate);

    const now = new Date().toISOString();

    return {
        id: crypto.randomUUID(),
        title,
        description,
        status,
        createdAt: now,
        updatedAt: now,
        startDate,
        dueDate,
    };
}

export function addTask(input: CreateTaskInput): Task {
    const task = createTask(input);
    const tasks = loadTasks();

    saveTasks([task, ...tasks]);

    return task;
}

export function getAllTasks(): Task[] {
    return loadTasks().sort(
        (first, second) =>
            Date.parse(second.createdAt) - Date.parse(first.createdAt),
    );
}

export function updateTask(
    id: string,
    changes: UpdateTaskInput,
): Task | null {
    const tasks = loadTasks();
    const index = tasks.findIndex((task) => task.id === id);

    if (index === -1) {
        return null;
    }

    const currentTask = tasks[index];

    if (!currentTask) {
        return null;
    }

    // Una actualización vacía no debe persistir ni alterar updatedAt.
    if (Object.keys(changes).length === 0) {
        return currentTask;
    }

    const updatedFields: UpdateTaskInput = { ...changes };

    if (updatedFields.title !== undefined) {
        updatedFields.title = validateTitle(updatedFields.title);
    }

    if (updatedFields.description !== undefined) {
        updatedFields.description = validateDescription(
            updatedFields.description,
        );
    }

    if (updatedFields.status !== undefined) {
        validateStatus(updatedFields.status);
    }

    if (updatedFields.dueDate !== undefined) {
        validateDueDate(updatedFields.dueDate);
    }

    if (updatedFields.startDate !== undefined) {
        validateStartDate(updatedFields.startDate);

        // Permite conservar fechas históricas, pero no asignar una
        // nueva fecha de inicio anterior al día actual.
        if (
            updatedFields.startDate !== null &&
            updatedFields.startDate !== currentTask.startDate &&
            updatedFields.startDate < getLocalDateString()
        ) {
            throw new Error(
                'La fecha de inicio debe ser hoy o una fecha futura.',
            );
        }
    }

    const resultingStartDate =
        updatedFields.startDate !== undefined
            ? updatedFields.startDate
            : currentTask.startDate ?? null;

    const resultingDueDate =
        updatedFields.dueDate !== undefined
            ? updatedFields.dueDate
            : currentTask.dueDate;

    validateDateRange(resultingStartDate, resultingDueDate);

    const updatedTask: Task = {
        ...currentTask,
        ...updatedFields,
        updatedAt: new Date().toISOString(),
    };

    tasks[index] = updatedTask;
    saveTasks(tasks);

    return updatedTask;
}

export function changeTaskStatus(
    id: string,
    status: TaskStatus,
): Task | null {
    validateStatus(status);

    return updateTask(id, { status });
}

export function deleteTask(id: string): boolean {
    const tasks = loadTasks();
    const remainingTasks = tasks.filter((task) => task.id !== id);

    if (remainingTasks.length === tasks.length) {
        return false;
    }

    saveTasks(remainingTasks);

    return true;
}

export function filterTasks(
    tasks: Task[],
    filters: TaskFilters,
    now: Date = new Date(),
): Task[] {
    return tasks.filter((task) => {
        const matchesStatus =
            filters.status === undefined ||
            task.status === filters.status;

        const automaticPriority = getAutomaticPriority(task, now);

        const matchesPriority =
            filters.priority === undefined ||
            automaticPriority === filters.priority;

        return matchesStatus && matchesPriority;
    });
}
