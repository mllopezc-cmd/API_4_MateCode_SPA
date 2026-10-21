type EmailTaskStatus =
    | 'pendiente'
    | 'en_progreso'
    | 'completada';

interface EmailTask {
    title: string;
    description: string;
    status: EmailTaskStatus;
}

interface TaskSummary {
    total: number;
    pendientes: number;
    enProgreso: number;
    completadas: number;
}

interface TaskEmailContent {
    subject: string;
    html: string;
    text: string;
    summary: TaskSummary;
}

const STATUS_LABELS: Record<EmailTaskStatus, string> = {
    pendiente: 'Pendiente',
    en_progreso: 'En progreso',
    completada: 'Completada',
};

function isTaskStatus(
    value: unknown,
): value is EmailTaskStatus {
    return (
        value === 'pendiente' ||
        value === 'en_progreso' ||
        value === 'completada'
    );
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseTask(value: unknown): EmailTask {
    if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value)
    ) {
        throw new Error('INVALID_TASK_DATA');
    }

    const data = value as Record<string, unknown>;

    if (
        typeof data.title !== 'string' ||
        data.title.trim().length < 3 ||
        data.title.trim().length > 200 ||
        typeof data.description !== 'string' ||
        data.description.length > 5000 ||
        !isTaskStatus(data.status)
    ) {
        throw new Error('INVALID_TASK_DATA');
    }

    return {
        title: data.title.trim(),
        description: data.description.trim(),
        status: data.status,
    };
}

export function buildTaskSummaryEmail(
    input: readonly unknown[],
): TaskEmailContent {
    const tasks = input.map(parseTask);

    const summary: TaskSummary = {
        total: tasks.length,
        pendientes: tasks.filter(
            (task) => task.status === 'pendiente',
        ).length,
        enProgreso: tasks.filter(
            (task) => task.status === 'en_progreso',
        ).length,
        completadas: tasks.filter(
            (task) => task.status === 'completada',
        ).length,
    };

    const htmlItems = tasks
        .map((task) => {
            const description = task.description
                ? `<p>${escapeHtml(task.description)}</p>`
                : '';

            return `
                <li>
                    <strong>${escapeHtml(task.title)}</strong>
                    <span> - ${STATUS_LABELS[task.status]}</span>
                    ${description}
                </li>
            `;
        })
        .join('');

    const textItems = tasks
        .map((task) => {
            const description = task.description
                ? `\n  ${task.description}`
                : '';

            return (
                `- ${task.title} ` +
                `[${STATUS_LABELS[task.status]}]` +
                description
            );
        })
        .join('\n\n');

    const subject = 'MateCode | Resumen de tus tareas';

    const text = [
        'Resumen de tareas - MateCode',
        '',
        `Total: ${summary.total}`,
        `Pendientes: ${summary.pendientes}`,
        `En progreso: ${summary.enProgreso}`,
        `Completadas: ${summary.completadas}`,
        '',
        textItems || 'No tienes tareas registradas.',
        '',
        'Este resumen fue solicitado desde MateCode.',
    ].join('\n');

    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Resumen de tareas</title>
        </head>
        <body>
            <h1>Resumen de tareas - MateCode</h1>
            <p>Este es el resumen de tus actividades.</p>
            <p>
                <strong>Total:</strong> ${summary.total}<br>
                <strong>Pendientes:</strong> ${summary.pendientes}<br>
                <strong>En progreso:</strong> ${summary.enProgreso}<br>
                <strong>Completadas:</strong> ${summary.completadas}
            </p>
            <h2>Detalle de tareas</h2>
            <ul>
                ${htmlItems || '<li>No tienes tareas registradas.</li>'}
            </ul>
            <p>Este resumen fue solicitado desde MateCode.</p>
        </body>
        </html>
    `.trim();

    return {
        subject,
        html,
        text,
        summary,
    };
}
