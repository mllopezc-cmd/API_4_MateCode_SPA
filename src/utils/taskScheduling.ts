import type { Task, TaskPriority, TaskStatus } from '../types/task';

export type DueDateStatus =
    | 'vencida'
    | 'por-vencer'
    | 'completada'
    | 'normal';

type TaskSchedulingData = Pick<Task, 'status' | 'dueDate'>;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function getDaysUntilDue(
    dueDate: string | null,
    now: Date = new Date(),
): number | null {
    if (dueDate === null) {
        return null;
    }

    const [year, month, day] = dueDate.split('-').map(Number);
    const dueDateInUtc = Date.UTC(year, month - 1, day);

    const todayInUtc = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
    );

    return Math.round(
        (dueDateInUtc - todayInUtc) / MILLISECONDS_PER_DAY,
    );
}

export function getDueDateStatus(
    task: TaskSchedulingData,
    now: Date = new Date(),
): DueDateStatus {
    if (task.status === 'completada') {
        return 'completada';
    }

    const daysUntilDue = getDaysUntilDue(task.dueDate, now);

    if (daysUntilDue === null) {
        return 'normal';
    }

    if (daysUntilDue < 0) {
        return 'vencida';
    }

    if (daysUntilDue <= 5) {
        return 'por-vencer';
    }

    return 'normal';
}

export function getAutomaticPriority(
    task: TaskSchedulingData,
    now: Date = new Date(),
): TaskPriority | null {
    if (task.status === 'completada') {
        return null;
    }

    const daysUntilDue = getDaysUntilDue(task.dueDate, now);

    if (daysUntilDue === null || daysUntilDue < 0) {
        return null;
    }

    if (daysUntilDue <= 5) {
        return 'alta';
    }

    if (daysUntilDue <= 10) {
        return 'media';
    }

    return 'baja';
}

export function isTaskStatus(value: string): value is TaskStatus {
    return (
        value === 'pendiente' ||
        value === 'en_progreso' ||
        value === 'completada'
    );
}
