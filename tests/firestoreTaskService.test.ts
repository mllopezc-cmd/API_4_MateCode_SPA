import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    collectionMock,
    deleteDocMock,
    docMock,
    getDocMock,
    getDocsMock,
    runTransactionMock,
    serverTimestampMock,
    setDocMock,
    getAuthMock,
    getFirebaseAppMock,
    getFirestoreDbMock,
    fromFirestoreTaskDataMock,
    toFirestoreTaskDataMock,
    validateUpdatedFirestoreTaskDataMock,
    transactionUpdateMock,
    timestampFromDateMock,
} = vi.hoisted(() => ({
    collectionMock: vi.fn(),
    deleteDocMock: vi.fn(),
    docMock: vi.fn(),
    getDocMock: vi.fn(),
    getDocsMock: vi.fn(),
    runTransactionMock: vi.fn(),
    serverTimestampMock: vi.fn(),
    setDocMock: vi.fn(),
    getAuthMock: vi.fn(),
    getFirebaseAppMock: vi.fn(),
    getFirestoreDbMock: vi.fn(),
    fromFirestoreTaskDataMock: vi.fn(),
    toFirestoreTaskDataMock: vi.fn(),
    validateUpdatedFirestoreTaskDataMock: vi.fn(),
    transactionUpdateMock: vi.fn(),
    timestampFromDateMock: vi.fn(),
}));

vi.mock('firebase/firestore/lite', () => ({
    Timestamp: {
        fromDate: timestampFromDateMock,
    },
    collection: collectionMock,
    deleteDoc: deleteDocMock,
    doc: docMock,
    getDoc: getDocMock,
    getDocs: getDocsMock,
    runTransaction: runTransactionMock,
    serverTimestamp: serverTimestampMock,
    setDoc: setDocMock,
}));

vi.mock('firebase/auth', () => ({
    getAuth: getAuthMock,
}));

vi.mock('../src/lib/firebase', () => ({
    getFirebaseApp: getFirebaseAppMock,
}));

vi.mock('../src/lib/firestore', () => ({
    getFirestoreDb: getFirestoreDbMock,
}));

vi.mock('../src/services/firestoreTaskMapper', () => ({
    fromFirestoreTaskData: fromFirestoreTaskDataMock,
    normalizeFirestoreTaskPatch: vi.fn((patch) => patch),
    toFirestoreTaskData: toFirestoreTaskDataMock,
    validateUpdatedFirestoreTaskData: validateUpdatedFirestoreTaskDataMock,
}));

import {
    createFirestoreTask,
    deleteFirestoreTask,
    getAllFirestoreTasks,
    updateFirestoreTask,
} from '../src/services/firestoreTaskService';

const user = {
    uid: 'user-123',
    emailVerified: true,
};

const db = { name: 'mock-db' };
const taskCollection = { path: 'users/user-123/tasks' };
const taskRef = { id: 'task-123', path: 'users/user-123/tasks/task-123' };

const taskData = {
    title: 'Preparar examen',
    description: 'Repasar temas',
    status: 'pendiente',
    startDate: null,
    dueDate: null,
};

const task = {
    id: 'task-123',
    ...taskData,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
};

const timestamp = {
    seconds: 1790858400,
    nanoseconds: 0,
};

function makeSnapshot(
    id: string,
    data: Record<string, unknown>,
    exists = true,
) {
    return {
        id,
        exists: () => exists,
        data: () => data,
    };
}

describe('firestoreTaskService', () => {
    beforeEach(() => {
        vi.resetAllMocks();

        getFirebaseAppMock.mockReturnValue({ name: '[DEFAULT]' });
        getFirestoreDbMock.mockReturnValue(db);
        getAuthMock.mockReturnValue({ currentUser: user });

        collectionMock.mockReturnValue(taskCollection);
        docMock.mockReturnValue(taskRef);
        serverTimestampMock.mockReturnValue({ serverTimestamp: true });
        timestampFromDateMock.mockImplementation((date: Date) => ({
            kind: 'firestore-timestamp',
            iso: date.toISOString(),
        }));

        toFirestoreTaskDataMock.mockReturnValue(taskData);
        fromFirestoreTaskDataMock.mockReturnValue(task);

        getDocMock.mockResolvedValue(
            makeSnapshot('task-123', {
                ...taskData,
                createdAt: timestamp,
                updatedAt: timestamp,
            }),
        );

        setDocMock.mockResolvedValue(undefined);
        deleteDocMock.mockResolvedValue(undefined);

        getDocsMock.mockResolvedValue({
            docs: [
                makeSnapshot('task-123', {
                    ...taskData,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }),
            ],
        });

        runTransactionMock.mockImplementation(
            async (_database, callback) => {
                const transaction = {
                    get: vi.fn().mockResolvedValue(
                        makeSnapshot('task-123', {
                            ...taskData,
                            createdAt: timestamp,
                            updatedAt: timestamp,
                        }),
                    ),
                    update: transactionUpdateMock,
                };

                return callback(transaction);
            },
        );
    });

    it('rechaza crear tareas sin sesión', async () => {
        getAuthMock.mockReturnValue({ currentUser: null });

        await expect(
            createFirestoreTask({ title: 'Nueva tarea' }),
        ).rejects.toThrow('Debes iniciar sesión');

        expect(setDocMock).not.toHaveBeenCalled();
    });

    it('rechaza usuarios cuyo correo no está verificado', async () => {
        getAuthMock.mockReturnValue({
            currentUser: { uid: user.uid, emailVerified: false },
        });

        await expect(
            getAllFirestoreTasks(),
        ).rejects.toThrow('Debes verificar tu correo');

        expect(getDocsMock).not.toHaveBeenCalled();
    });

    it('crea una tarea bajo la colección del usuario autenticado', async () => {
        const result = await createFirestoreTask({
            title: 'Preparar examen',
        });

        expect(collectionMock).toHaveBeenCalledWith(
            db,
            'users',
            user.uid,
            'tasks',
        );

        expect(setDocMock).toHaveBeenCalledWith(taskRef, {
            ...taskData,
            createdAt: { serverTimestamp: true },
            updatedAt: { serverTimestamp: true },
        });

        expect(serverTimestampMock).toHaveBeenCalledTimes(2);

        expect(result).toEqual({
            id: taskRef.id,
            ...taskData,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
        });

        expect(Number.isNaN(Date.parse(result.createdAt))).toBe(false);
        expect(Number.isNaN(Date.parse(result.updatedAt))).toBe(false);
        expect(result.createdAt).toBe(result.updatedAt);
    });

    it('crea la tarea sin hacer una lectura adicional', async () => {
        const result = await createFirestoreTask({
            title: 'Preparar examen',
        });

        expect(setDocMock).toHaveBeenCalledOnce();
        expect(getDocMock).not.toHaveBeenCalled();
        expect(result.id).toBe(taskRef.id);
        expect(result.title).toBe(taskData.title);
    });

    it('lista las tareas de la colección del usuario autenticado', async () => {
        const result = await getAllFirestoreTasks();

        expect(getDocsMock).toHaveBeenCalledWith(taskCollection);
        expect(fromFirestoreTaskDataMock).toHaveBeenCalledWith(
            'task-123',
            expect.any(Object),
        );
        expect(result).toEqual([task]);
    });

    it('reutiliza una consulta pendiente para el mismo usuario', async () => {
        let resolveSnapshot!: (value: {
            docs: ReturnType<typeof makeSnapshot>[];
        }) => void;

        const pendingSnapshot = new Promise<{
            docs: ReturnType<typeof makeSnapshot>[];
        }>((resolve) => {
            resolveSnapshot = resolve;
        });

        getDocsMock.mockReturnValueOnce(pendingSnapshot);

        const firstRequest = getAllFirestoreTasks();
        const secondRequest = getAllFirestoreTasks();

        expect(getDocsMock).toHaveBeenCalledTimes(1);

        resolveSnapshot({
            docs: [
                makeSnapshot('task-123', {
                    ...taskData,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }),
            ],
        });

        const [firstResult, secondResult] = await Promise.all([
            firstRequest,
            secondRequest,
        ]);

        expect(firstResult).toEqual([task]);
        expect(secondResult).toEqual([task]);
        expect(getDocsMock).toHaveBeenCalledTimes(1);

        // Una vez finalizada, una nueva consulta
        // debe obtener datos actualizados.
        getDocsMock.mockResolvedValueOnce({
            docs: [],
        });

        const thirdResult = await getAllFirestoreTasks();

        expect(thirdResult).toEqual([]);
        expect(getDocsMock).toHaveBeenCalledTimes(2);
    });

    it('permite repetir una consulta después de un fallo', async () => {
        getDocsMock
            .mockRejectedValueOnce(
                new Error('Error temporal de Firestore'),
            )
            .mockResolvedValueOnce({
                docs: [],
            });

        await expect(
            getAllFirestoreTasks(),
        ).rejects.toThrow('Error temporal de Firestore');

        const result = await getAllFirestoreTasks();

        expect(result).toEqual([]);
        expect(getDocsMock).toHaveBeenCalledTimes(2);
    });

    it('rechaza actualizar un identificador vacío', async () => {
        await expect(
            updateFirestoreTask('   ', { title: 'Nuevo título' }),
        ).rejects.toThrow('El identificador de la tarea no es válido.');

        expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it('rechaza actualizar una tarea inexistente', async () => {
        runTransactionMock.mockImplementationOnce(
            async (_database, callback) => {
                const transaction = {
                    get: vi.fn().mockResolvedValue(
                        makeSnapshot('task-123', {}, false),
                    ),
                    update: vi.fn(),
                };

                return callback(transaction);
            },
        );

        await expect(
            updateFirestoreTask('task-123', {
                title: 'Nuevo título',
            }),
        ).rejects.toThrow('La tarea no existe o ya fue eliminada.');

        expect(getDocMock).not.toHaveBeenCalled();
    });

    it('valida y persiste un parche sin modificar createdAt y usando timestamp del servidor', async () => {
        const patch = { title: 'Título actualizado' };

        await updateFirestoreTask('task-123', patch);

        expect(validateUpdatedFirestoreTaskDataMock).toHaveBeenCalledWith(
            task,
            patch,
        );

        expect(runTransactionMock).toHaveBeenCalledOnce();

        expect(transactionUpdateMock).toHaveBeenCalledOnce();
        expect(transactionUpdateMock).toHaveBeenCalledWith(taskRef, {
            title: 'Título actualizado',
            updatedAt: { serverTimestamp: true },
        });

        expect(serverTimestampMock).toHaveBeenCalledOnce();
        expect(getDocMock).toHaveBeenCalledWith(taskRef);
    });

    it('convierte startDate y dueDate a Timestamp antes de actualizar Firestore', async () => {
        const patch = {
            startDate: '2026-10-21',
            dueDate: '2026-10-25',
        };

        await updateFirestoreTask('task-123', patch);

        expect(
            validateUpdatedFirestoreTaskDataMock,
        ).toHaveBeenCalledWith(task, patch);

        expect(timestampFromDateMock).toHaveBeenCalledTimes(2);

        expect(timestampFromDateMock).toHaveBeenNthCalledWith(
            1,
            new Date('2026-10-21T00:00:00.000Z'),
        );

        expect(timestampFromDateMock).toHaveBeenNthCalledWith(
            2,
            new Date('2026-10-25T00:00:00.000Z'),
        );

        expect(transactionUpdateMock).toHaveBeenCalledWith(
            taskRef,
            {
                startDate: {
                    kind: 'firestore-timestamp',
                    iso: '2026-10-21T00:00:00.000Z',
                },
                dueDate: {
                    kind: 'firestore-timestamp',
                    iso: '2026-10-25T00:00:00.000Z',
                },
                updatedAt: { serverTimestamp: true },
            },
        );
    });

    it('conserva null al eliminar las fechas programadas', async () => {
        const patch = {
            startDate: null,
            dueDate: null,
        };

        await updateFirestoreTask('task-123', patch);

        expect(timestampFromDateMock).not.toHaveBeenCalled();

        expect(transactionUpdateMock).toHaveBeenCalledWith(
            taskRef,
            {
                startDate: null,
                dueDate: null,
                updatedAt: { serverTimestamp: true },
            },
        );
    });

    it('no modifica las fechas al actualizar solamente el estado', async () => {
        await updateFirestoreTask('task-123', {
            status: 'completada',
        });

        expect(timestampFromDateMock).not.toHaveBeenCalled();

        expect(transactionUpdateMock).toHaveBeenCalledWith(
            taskRef,
            {
                status: 'completada',
                updatedAt: { serverTimestamp: true },
            },
        );
    });

    it('rechaza eliminar un identificador vacío', async () => {
        await expect(
            deleteFirestoreTask(''),
        ).rejects.toThrow('El identificador de la tarea no es válido.');

        expect(deleteDocMock).not.toHaveBeenCalled();
    });

    it('elimina una tarea de la colección del usuario autenticado', async () => {
        await deleteFirestoreTask('task-123');

        expect(docMock).toHaveBeenCalledWith(
            taskCollection,
            'task-123',
        );
        expect(deleteDocMock).toHaveBeenCalledWith(taskRef);
    });

    it('propaga los errores de Firestore al crear una tarea', async () => {
        setDocMock.mockRejectedValueOnce(new Error('permission-denied'));

        await expect(
            createFirestoreTask({ title: 'Nueva tarea' }),
        ).rejects.toThrow('permission-denied');
    });
});