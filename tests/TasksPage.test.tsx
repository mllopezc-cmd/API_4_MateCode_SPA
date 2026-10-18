import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TasksPage from '../src/pages/TasksPage';
import * as taskService from '../src/services/taskService';
import { formatCalendarDate } from '../src/utils/dateFormatting';

afterEach(() => {
    vi.restoreAllMocks();
});

function renderTasksPage(path = '/tareas') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <TasksPage />
        </MemoryRouter>,
    );
}

function getDateInDays(daysFromToday: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

describe('Interfaz de gestión de tareas', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('muestra el formulario y el mensaje cuando no hay tareas', () => {
        renderTasksPage();

        expect(
            screen.getByRole('heading', { name: 'Crear una tarea' }),
        ).toBeInTheDocument();

        expect(
            screen.getByText(/Todavía no tienes tareas/),
        ).toBeInTheDocument();
    });

    it('no confunde un fallo de lectura inicial con una lista vacía', () => {
        vi.spyOn(taskService, 'getAllTasks').mockImplementation(() => {
            throw new Error('Fallo de lectura simulado.');
        });

        renderTasksPage();

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Fallo de lectura simulado.',
        );

        expect(
            screen.queryByText('Todavía no tienes tareas'),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByText('0 tareas encontradas'),
        ).not.toBeInTheDocument();

        expect(
            screen.getByRole('button', { name: 'Reintentar carga' }),
        ).toBeInTheDocument();
    });

    it('recupera la lista cuando se reintenta una lectura fallida', () => {
        const getAllTasksOriginal = taskService.getAllTasks;

        const getAllTasksSpy = vi
            .spyOn(taskService, 'getAllTasks')
            .mockImplementationOnce(() => {
                throw new Error('Fallo temporal de lectura.');
            })
            .mockImplementationOnce(() => getAllTasksOriginal());

        renderTasksPage();

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Fallo temporal de lectura.',
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Reintentar carga' }),
        );

        expect(getAllTasksSpy).toHaveBeenCalledTimes(2);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByText('0 tareas encontradas')).toBeInTheDocument();
        expect(
            screen.getByText('Todavía no tienes tareas'),
        ).toBeInTheDocument();
    });

    it('informa de una escritura exitosa cuando falla la recarga posterior', () => {
        const getAllTasksOriginal = taskService.getAllTasks;

        vi.spyOn(taskService, 'getAllTasks')
            .mockImplementationOnce(() => getAllTasksOriginal())
            .mockImplementationOnce(() => {
                throw new Error('Fallo de recarga simulado.');
            });

        renderTasksPage();

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea guardada sin recarga' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        expect(screen.getByRole('alert')).toHaveTextContent(
            'La tarea se creó correctamente.',
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'no se pudo actualizar la lista de tareas',
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Fallo de recarga simulado.',
        );

        expect(
            screen.queryByRole('heading', {
                name: 'Tarea guardada sin recarga',
            }),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByText('0 tareas encontradas'),
        ).not.toBeInTheDocument();

        expect(localStorage.getItem('matecode-tasks')).toContain(
            'Tarea guardada sin recarga',
        );

        expect(
            screen.getByRole('button', { name: 'Reintentar carga' }),
        ).toBeInTheDocument();
    });

    it('no comunica éxito cuando falla la escritura de una tarea', () => {
        vi.spyOn(taskService, 'addTask').mockImplementation(() => {
            throw new Error('Fallo de escritura simulado.');
        });

        renderTasksPage();

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea que no se guardó' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Fallo de escritura simulado.',
        );

        expect(
            screen.queryByRole('status'),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByRole('heading', {
                name: 'Tarea que no se guardó',
            }),
        ).not.toBeInTheDocument();
    });

    it('crea una tarea y la muestra en el listado', () => {
        renderTasksPage();

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Estudiar React' },
        });

        fireEvent.change(screen.getByLabelText('Descripción (opcional)'), {
            target: { value: 'Repasar componentes' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        expect(
            screen.getByRole('heading', { name: 'Estudiar React' }),
        ).toBeInTheDocument();

        expect(screen.getByText('Repasar componentes')).toBeInTheDocument();
        expect(localStorage.getItem('matecode-tasks')).toContain('Estudiar React');
    });

    it('crea una tarea con fecha de inicio y fecha límite válidas', () => {
        renderTasksPage();

        const startDate = getDateInDays(1);
        const dueDate = getDateInDays(5);

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea planificada' },
        });

        fireEvent.change(
            screen.getByLabelText('Fecha de inicio planificada (opcional)'),
            {
                target: { value: startDate },
            },
        );

        fireEvent.change(screen.getByLabelText(/fecha límite/i), {
            target: { value: dueDate },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        expect(
            screen.getByText(
                `Inicio planificado: ${formatCalendarDate(startDate)}`,
            ),
        ).toBeInTheDocument();

        const storedTasks = JSON.parse(
            localStorage.getItem('matecode-tasks') ?? '[]',
        ) as Array<{ startDate: string | null; dueDate: string | null }>;

        expect(storedTasks[0]?.startDate).toBe(startDate);
        expect(storedTasks[0]?.dueDate).toBe(dueDate);
    });

    it('rechaza una fecha de inicio pasada al crear una tarea', () => {
        renderTasksPage();

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea con inicio pasado' },
        });

        fireEvent.change(
            screen.getByLabelText('Fecha de inicio planificada (opcional)'),
            {
                target: { value: getDateInDays(-1) },
            },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        expect(screen.getByRole('alert')).toHaveTextContent(
            'La fecha de inicio debe ser hoy o una fecha futura.',
        );

        expect(
            screen.queryByRole('heading', { name: 'Tarea con inicio pasado' }),
        ).not.toBeInTheDocument();
    });

    it('rechaza una fecha límite anterior a la fecha de inicio', () => {
        renderTasksPage();

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea con fechas incompatibles' },
        });

        fireEvent.change(
            screen.getByLabelText('Fecha de inicio planificada (opcional)'),
            {
                target: { value: getDateInDays(5) },
            },
        );

        fireEvent.change(screen.getByLabelText(/fecha límite/i), {
            target: { value: getDateInDays(2) },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        expect(screen.getByRole('alert')).toHaveTextContent(
            'La fecha límite debe ser igual o posterior a la fecha de inicio.',
        );

        expect(
            screen.queryByRole('heading', {
                name: 'Tarea con fechas incompatibles',
            }),
        ).not.toBeInTheDocument();
    });

    it('permite editar una tarea existente', () => {
        renderTasksPage();

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea original' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        fireEvent.click(
            screen.getByRole('button', { name: /^Editar$/ }),
        );

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea modificada' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

        expect(
            screen.getByRole('heading', { name: 'Tarea modificada' }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('heading', { name: 'Tarea original' }),
        ).not.toBeInTheDocument();
    });

    it('permite editar la fecha de inicio de una tarea existente', () => {
        renderTasksPage();

        const originalStartDate = getDateInDays(1);
        const updatedStartDate = getDateInDays(2);

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea para reprogramar' },
        });

        fireEvent.change(
            screen.getByLabelText('Fecha de inicio planificada (opcional)'),
            {
                target: { value: originalStartDate },
            },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        fireEvent.click(screen.getByRole('button', { name: /^Editar$/ }));

        const startDateInput = screen.getByLabelText(
            'Fecha de inicio planificada (opcional)',
        ) as HTMLInputElement;

        expect(startDateInput.value).toBe(originalStartDate);

        fireEvent.change(startDateInput, {
            target: { value: updatedStartDate },
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        expect(
            screen.getByText(
                `Inicio planificado: ${formatCalendarDate(updatedStartDate)}`,
            ),
        ).toBeInTheDocument();

        const storedTasks = JSON.parse(
            localStorage.getItem('matecode-tasks') ?? '[]',
        ) as Array<{ startDate: string | null }>;

        expect(storedTasks[0]?.startDate).toBe(updatedStartDate);
    });

    it('permite marcar una tarea como completada', () => {
        renderTasksPage();

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea de prueba' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        fireEvent.change(
            screen.getByRole('combobox', {
                name: 'Estado de la tarea',
            }),
            {
                target: { value: 'completada' },
            },
        );

        expect(
            screen.getByText('Estado: Completada'),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('button', { name: 'Marcar como completada' }),
        ).not.toBeInTheDocument();
    });

    it('filtra tareas por prioridad automática', () => {
        renderTasksPage();

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea urgente' },
        });

        fireEvent.change(screen.getByLabelText(/fecha límite/i), {
            target: { value: getDateInDays(3) },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea normal' },
        });

        fireEvent.change(screen.getByLabelText(/fecha límite/i), {
            target: { value: getDateInDays(8) },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        fireEvent.change(screen.getByLabelText('Filtrar por prioridad'), {
            target: { value: 'alta' },
        });

        expect(
            screen.getByRole('heading', { name: 'Tarea urgente' }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('heading', { name: 'Tarea normal' }),
        ).not.toBeInTheDocument();
    });

    it('combina los filtros de estado y prioridad correctamente', () => {
        renderTasksPage();

        const dueDate = getDateInDays(8);

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea pendiente media' },
        });
        fireEvent.change(screen.getByLabelText(/fecha límite/i), {
            target: { value: dueDate },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea en progreso media' },
        });
        fireEvent.change(screen.getByLabelText(/fecha límite/i), {
            target: { value: dueDate },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        const inProgressTask = screen.getByRole('article', {
            name: 'Tarea: Tarea en progreso media',
        });

        fireEvent.change(
            within(inProgressTask).getByRole('combobox', {
                name: 'Estado de la tarea',
            }),
            { target: { value: 'en_progreso' } },
        );

        fireEvent.change(screen.getByLabelText('Filtrar por estado'), {
            target: { value: 'en_progreso' },
        });

        fireEvent.change(screen.getByLabelText('Filtrar por prioridad'), {
            target: { value: 'media' },
        });

        expect(
            screen.getByRole('heading', {
                name: 'Tarea en progreso media',
            }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('heading', {
                name: 'Tarea pendiente media',
            }),
        ).not.toBeInTheDocument();

        expect(screen.getByText('1 tarea encontrada')).toBeInTheDocument();
    });

    it('solicita confirmación antes de eliminar una tarea', () => {
        const confirmSpy = vi
            .spyOn(window, 'confirm')
            .mockReturnValue(false);

        renderTasksPage();

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea protegida' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        fireEvent.click(
            screen.getByRole('button', { name: 'Eliminar Tarea protegida' }),
        );

        expect(confirmSpy).toHaveBeenCalledOnce();

        expect(
            screen.getByRole('heading', { name: 'Tarea protegida' }),
        ).toBeInTheDocument();

        confirmSpy.mockRestore();
    });

    it('elimina la tarea cuando se confirma la acción', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderTasksPage();

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea para eliminar' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        fireEvent.click(
            screen.getByRole('button', { name: 'Eliminar Tarea para eliminar' }),
        );

        expect(
            screen.queryByRole('heading', { name: 'Tarea para eliminar' }),
        ).not.toBeInTheDocument();

        expect(localStorage.getItem('matecode-tasks')).not.toContain(
            'Tarea para eliminar',
        );
    });

    it('recupera las tareas guardadas al montar la página nuevamente', () => {
        const firstRender = renderTasksPage();

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea persistente' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        firstRender.unmount();
        renderTasksPage();

        expect(
            screen.getByRole('heading', { name: 'Tarea persistente' }),
        ).toBeInTheDocument();
    });

    it('muestra el estado vacío de los filtros y permite restablecerlos', () => {
        renderTasksPage();

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Tarea urgente' },
        });
        fireEvent.change(screen.getByLabelText(/fecha límite/i), {
            target: { value: getDateInDays(3) },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

        fireEvent.change(screen.getByLabelText('Filtrar por prioridad'), {
            target: { value: 'baja' },
        });

        expect(screen.getByText('0 tareas encontradas')).toBeInTheDocument();

        expect(
            screen.getByText('No encontramos tareas'),
        ).toBeInTheDocument();

        expect(
            screen.getByText(
                /Ninguna tarea coincide con los filtros seleccionados/,
            ),
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: 'Restablecer filtros' }),
        );

        expect(
            screen.getByLabelText('Filtrar por estado'),
        ).toHaveValue('todas');

        expect(
            screen.getByLabelText('Filtrar por prioridad'),
        ).toHaveValue('todas');

        expect(
            screen.getByRole('heading', { name: 'Tarea urgente' }),
        ).toBeInTheDocument();

        expect(screen.getByText('1 tarea encontrada')).toBeInTheDocument();
    });
});