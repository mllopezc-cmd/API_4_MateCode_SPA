import { readFileSync } from 'node:fs';
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    it,
} from 'vitest';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

import {
    Timestamp,
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore';

const projectId = 'demo-matecode-rules-test';
const rules = readFileSync(
    new URL('../firestore.rules', import.meta.url),
    'utf8',
);

const validTask = {
    title: 'Preparar informe',
    description: '',
    status: 'pendiente',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    startDate: null,
    dueDate: null,
};

function utcDate(value: string): Timestamp {
    return Timestamp.fromDate(
        new Date(`${value}T00:00:00.000Z`),
    );
}

let testEnv: Awaited<
    ReturnType<typeof initializeTestEnvironment>
>;

async function seedTask(
    path = 'users/alice/tasks/task-1',
): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), path), {
            title: 'Preparar informe',
            description: '',
            status: 'pendiente',
            createdAt: Timestamp.fromMillis(1_000),
            updatedAt: Timestamp.fromMillis(1_000),
            startDate: null,
            dueDate: null,
        });
    });
}

function aliceDb() {
    return testEnv
        .authenticatedContext('alice', { email_verified: true })
        .firestore();
}

function bobDb() {
    return testEnv
        .authenticatedContext('bob', { email_verified: true })
        .firestore();
}

describe('Reglas de seguridad de Firestore para tareas', () => {
    beforeAll(async () => {
        testEnv = await initializeTestEnvironment({
            projectId,
            firestore: {
                host: '127.0.0.1',
                port: 8080,
                rules,
            },
        });
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    it('permite crear una tarea válida al propietario verificado', async () => {
        await assertSucceeds(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
                validTask,
            ),
        );
    });

    it('rechaza el acceso de un usuario no autenticado', async () => {
        await assertFails(
            getDoc(
                doc(
                    testEnv.unauthenticatedContext().firestore(),
                    'users/alice/tasks/task-1',
                ),
            ),
        );
    });

    it('rechaza la lectura de un usuario sin correo verificado', async () => {
        await assertFails(
            getDoc(
                doc(
                    testEnv
                        .authenticatedContext('alice', {
                            email_verified: false,
                        })
                        .firestore(),
                    'users/alice/tasks/task-1',
                ),
            ),
        );
    });

    it('impide que otro usuario lea una tarea ajena', async () => {
        await seedTask();

        await assertFails(
            getDoc(doc(bobDb(), 'users/alice/tasks/task-1')),
        );
    });

    it('rechaza crear tareas con correo no verificado', async () => {
        const db = testEnv
            .authenticatedContext('alice', {
                email_verified: false,
            })
            .firestore();

        await assertFails(
            setDoc(
                doc(db, 'users/alice/tasks/unverified-create'),
                validTask,
            ),
        );
    });

    it('impide crear tareas bajo el UID de otro usuario', async () => {
        await assertFails(
            setDoc(
                doc(aliceDb(), 'users/bob/tasks/foreign-create'),
                validTask,
            ),
        );
    });

    it('rechaza actualizar tareas con correo no verificado', async () => {
        await seedTask();

        const db = testEnv
            .authenticatedContext('alice', {
                email_verified: false,
            })
            .firestore();

        await assertFails(
            updateDoc(
                doc(db, 'users/alice/tasks/task-1'),
                {
                    title: 'Intento de actualización',
                    updatedAt: serverTimestamp(),
                },
            ),
        );
    });

    it('rechaza eliminar tareas con correo no verificado', async () => {
        await seedTask();

        const db = testEnv
            .authenticatedContext('alice', {
                email_verified: false,
            })
            .firestore();

        await assertFails(
            deleteDoc(
                doc(db, 'users/alice/tasks/task-1'),
            ),
        );
    });

    it('rechaza campos adicionales en una tarea', async () => {
        await assertFails(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
                { ...validTask, priority: 'alta' },
            ),
        );
    });

    it('rechaza fechas almacenadas como strings', async () => {
        await assertFails(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
                {
                    ...validTask,
                    startDate: '2028-02-29',
                },
            ),
        );
    });

    it('acepta una fecha válida de año bisiesto como Timestamp UTC', async () => {
        await assertSucceeds(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
                {
                    ...validTask,
                    startDate: utcDate('2028-02-29'),
                    dueDate: utcDate('2028-03-01'),
                },
            ),
        );
    });

    it('rechaza un rango de fechas invertido', async () => {
        await assertFails(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
                {
                    ...validTask,
                    startDate: utcDate('2028-05-10'),
                    dueDate: utcDate('2028-05-01'),
                },
            ),
        );
    });

    it('permite al propietario actualizar una tarea válida', async () => {
        await seedTask();

        await assertSucceeds(
            updateDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
                {
                    title: 'Informe actualizado',
                    updatedAt: serverTimestamp(),
                },
            ),
        );
    });

    it('impide modificar createdAt', async () => {
        await seedTask();

        await assertFails(
            updateDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
                {
                    createdAt: Timestamp.fromMillis(2_000),
                    updatedAt: serverTimestamp(),
                },
            ),
        );
    });

    it('impide que otro usuario elimine una tarea ajena', async () => {
        await seedTask();

        await assertFails(
            deleteDoc(
                doc(bobDb(), 'users/alice/tasks/task-1'),
            ),
        );
    });

    it('permite al propietario eliminar su tarea', async () => {
        await seedTask();

        await assertSucceeds(
            deleteDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
            ),
        );
    });

    it('rechaza títulos que no contienen letras ni números', async () => {
        await assertFails(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
                { ...validTask, title: '   ' },
            ),
        );
    });

    it('rechaza una descripción demasiado larga', async () => {
        await assertFails(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
                { ...validTask, description: 'a'.repeat(5001) },
            ),
        );
    });

    it('rechaza un estado no contemplado por el esquema', async () => {
        await assertFails(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
                { ...validTask, status: 'archivada' },
            ),
        );
    });

    it('acepta títulos con letras y tildes españolas permitidas', async () => {
        await assertSucceeds(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/spanish-title'),
                {
                    ...validTask,
                    title: 'Preparar revisión ágil Ñandú',
                },
            ),
        );
    });

    it('rechaza títulos que superan los 200 caracteres', async () => {
        await assertFails(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/long-title'),
                {
                    ...validTask,
                    title: 'A'.repeat(201),
                },
            ),
        );
    });

    it('rechaza descripciones no vacías de menos de 3 caracteres', async () => {
        await assertFails(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/short-description'),
                {
                    ...validTask,
                    description: 'ab',
                },
            ),
        );
    });

    it('rechaza descripciones compuestas solo por espacios', async () => {
        await assertFails(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/blank-description'),
                {
                    ...validTask,
                    description: '   ',
                },
            ),
        );
    });

    it('permite una descripción vacía', async () => {
        await assertSucceeds(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/empty-description'),
                {
                    ...validTask,
                    description: '',
                },
            ),
        );
    });

    it('rechaza asignar una nueva fecha de inicio pasada al actualizar', async () => {
        await seedTask();

        await assertFails(
            updateDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
                {
                    startDate: utcDate('2000-01-01'),
                    updatedAt: serverTimestamp(),
                },
            ),
        );
    });

    it('rechaza fechas Timestamp que no están normalizadas a medianoche UTC', async () => {
        await assertFails(
            setDoc(
                doc(aliceDb(), 'users/alice/tasks/non-midnight-date'),
                {
                    ...validTask,
                    startDate: Timestamp.fromDate(
                        new Date('2028-02-29T10:30:00.000Z'),
                    ),
                },
            ),
        );
    });

    it('rechaza modificar updatedAt sin actualizarlo con la hora del servidor', async () => {
        await seedTask();

        await assertFails(
            updateDoc(
                doc(aliceDb(), 'users/alice/tasks/task-1'),
                {
                    title: 'Informe actualizado',
                    updatedAt: Timestamp.fromMillis(2_000),
                },
            ),
        );
    });
});
