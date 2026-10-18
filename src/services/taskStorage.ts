import type { Task } from '../types/task';

const STORAGE_KEY = 'matecode-tasks';

const TASK_STATUSES = ['pendiente', 'en_progreso', 'completada'];

function isValidDateTime(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value.trim() !== '' &&
        !Number.isNaN(Date.parse(value))
    );
}

function isValidDateOnly(value: unknown): value is string {
    if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function isValidDueDate(value: unknown): boolean {
    return value === null || isValidDateOnly(value);
}

function isTask(value: unknown): value is Task {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const task = value as Record<string, unknown>;

    const hasValidStartDate =
        task.startDate === undefined ||
        task.startDate === null ||
        isValidDateOnly(task.startDate);

    const startDate = task.startDate;
    const dueDate = task.dueDate;

    const hasValidDateRange =
        startDate === undefined ||
        startDate === null ||
        dueDate === null ||
        (
            typeof startDate === 'string' &&
            typeof dueDate === 'string' &&
            startDate <= dueDate
        );

    return (
        typeof task.id === 'string' &&
        task.id.trim() !== '' &&
        typeof task.title === 'string' &&
        task.title.trim() !== '' &&
        typeof task.description === 'string' &&
        typeof task.status === 'string' &&
        TASK_STATUSES.includes(task.status) &&
        isValidDateTime(task.createdAt) &&
        isValidDateTime(task.updatedAt) &&
        isValidDueDate(task.dueDate) &&
        hasValidStartDate &&
        hasValidDateRange
    );
}

function normalizeTask(task: Task): Task {
    const normalizedTask = {
        ...task,
        startDate: task.startDate ?? null,
    };

    // Compatibilidad con registros históricos que guardaban priority.
    delete (normalizedTask as Task & { priority?: unknown }).priority;

    return normalizedTask;
}

function hasUniqueIds(tasks: Task[]): boolean {
    const ids = new Set<string>();

    for (const task of tasks) {
        if (ids.has(task.id)) {
            return false;
        }

        ids.add(task.id);
    }

    return true;
}

function storageError(message: string, cause?: unknown): Error {
    const error = new Error(message);

    if (cause !== undefined) {
        (error as Error & { cause?: unknown }).cause = cause;
    }

    return error;
}

export function getTasks(): Task[] {
    let storedData: string | null;

    try {
        storedData = localStorage.getItem(STORAGE_KEY);
    } catch (cause) {
        throw storageError(
            'No se pudieron leer las tareas del almacenamiento local.',
            cause,
        );
    }

    if (storedData === null) {
        return [];
    }

    let parsedData: unknown;

    try {
        parsedData = JSON.parse(storedData);
    } catch (cause) {
        throw storageError(
            'Los datos guardados de las tareas están dañados. No se modificarán para proteger la información existente.',
            cause,
        );
    }

    if (!Array.isArray(parsedData)) {
        throw storageError(
            'El almacenamiento de tareas tiene un formato inesperado. No se modificarán los datos existentes.',
        );
    }

    if (!parsedData.every(isTask)) {
        throw storageError(
            'Hay tareas guardadas con datos inválidos. No se modificarán los datos existentes.',
        );
    }

    const normalizedTasks = (parsedData as Task[]).map(normalizeTask);

    if (!hasUniqueIds(normalizedTasks)) {
        throw storageError(
            'Hay tareas guardadas con identificadores duplicados. No se modificarán los datos existentes.',
        );
    }

    return normalizedTasks;
}

export function saveTasks(tasks: Task[]): void {
    if (!Array.isArray(tasks) || !tasks.every(isTask)) {
        throw storageError(
            'No se guardaron las tareas porque la lista contiene datos inválidos.',
        );
    }

    const normalizedTasks = tasks.map(normalizeTask);

    if (!hasUniqueIds(normalizedTasks)) {
        throw storageError(
            'No se guardaron las tareas porque la lista contiene identificadores duplicados.',
        );
    }

    let serializedData: string;

    try {
        serializedData = JSON.stringify(normalizedTasks);
    } catch (cause) {
        throw storageError(
            'No se pudieron preparar las tareas para guardarlas.',
            cause,
        );
    }

    try {
        localStorage.setItem(STORAGE_KEY, serializedData);
    } catch (cause) {
        throw storageError(
            'No se pudieron guardar las tareas. Comprueba el almacenamiento disponible en el navegador.',
            cause,
        );
    }
}
