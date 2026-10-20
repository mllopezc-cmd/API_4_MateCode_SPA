import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    runTransaction,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

import { getFirestoreDb } from '../lib/firestore';
import { getFirebaseApp } from '../lib/firebase';
import {
    fromFirestoreTaskData,
    normalizeFirestoreTaskPatch,
    toFirestoreTaskData,
    validateUpdatedFirestoreTaskData,
} from './firestoreTaskMapper';
import type { CreateTaskInput, Task, UpdateTaskInput } from '../types/task';

function getVerifiedUser() {
    const user = getAuth(getFirebaseApp()).currentUser;

    if (!user) {
        throw new Error('Debes iniciar sesión para acceder a tus tareas.');
    }

    if (!user.emailVerified) {
        throw new Error('Debes verificar tu correo para acceder a tus tareas.');
    }

    return user;
}

function getTasksCollection(uid: string) {
    return collection(getFirestoreDb(), 'users', uid, 'tasks');
}

export async function createFirestoreTask(
    input: CreateTaskInput,
): Promise<Task> {
    const user = getVerifiedUser();
    const data = toFirestoreTaskData(input);
    const taskRef = doc(getTasksCollection(user.uid));

    await setDoc(taskRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // La escritura ya fue confirmada por Firestore.
    // Evitamos una lectura adicional solo para recuperar la tarea.
    const now = new Date().toISOString();

    return {
        id: taskRef.id,
        title: data.title,
        description: data.description,
        status: data.status,
        createdAt: now,
        updatedAt: now,
        startDate: data.startDate
            ? data.startDate.toDate().toISOString().slice(0, 10)
            : null,
        dueDate: data.dueDate
            ? data.dueDate.toDate().toISOString().slice(0, 10)
            : null,
    };
}

export async function getAllFirestoreTasks(): Promise<Task[]> {
    const user = getVerifiedUser();
    const snapshot = await getDocs(getTasksCollection(user.uid));

    return snapshot.docs.map((taskDoc) =>
        fromFirestoreTaskData(taskDoc.id, taskDoc.data()),
    );
}

export async function updateFirestoreTask(
    taskId: string,
    patch: UpdateTaskInput,
): Promise<Task> {
    const user = getVerifiedUser();

    if (!taskId.trim()) {
        throw new Error('El identificador de la tarea no es válido.');
    }

    const taskRef = doc(getTasksCollection(user.uid), taskId);
    const db = getFirestoreDb();

    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(taskRef);

        if (!snapshot.exists()) {
            throw new Error('La tarea no existe o ya fue eliminada.');
        }

        const current = fromFirestoreTaskData(
            snapshot.id,
            snapshot.data(),
        );

        const normalizedPatch = normalizeFirestoreTaskPatch(patch);

        validateUpdatedFirestoreTaskData(current, normalizedPatch);

        const updates = Object.fromEntries(
            Object.entries(normalizedPatch).filter(
                ([, value]) => value !== undefined,
            ),
        );

        transaction.update(taskRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    });

    const snapshot = await getDoc(taskRef);

    if (!snapshot.exists()) {
        throw new Error(
            'La tarea ya no existe después de la actualización.',
        );
    }

    return fromFirestoreTaskData(
        snapshot.id,
        snapshot.data(),
    );
}

export async function deleteFirestoreTask(
    taskId: string,
): Promise<void> {
    const user = getVerifiedUser();

    if (!taskId.trim()) {
        throw new Error('El identificador de la tarea no es válido.');
    }

    await deleteDoc(doc(getTasksCollection(user.uid), taskId));
}
