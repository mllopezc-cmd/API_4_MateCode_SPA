export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada';

export type TaskPriority = 'baja' | 'media' | 'alta';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    createdAt: string;
    updatedAt: string;
    startDate: string | null;
    dueDate: string | null;
}

export interface CreateTaskInput {
    title: string;
    description?: string;
    status?: TaskStatus;
    startDate?: string | null;
    dueDate?: string | null;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    status?: TaskStatus;
    startDate?: string | null;
    dueDate?: string | null;
}

export interface TaskFilters {
    status?: TaskStatus;
    priority?: TaskPriority;
}
