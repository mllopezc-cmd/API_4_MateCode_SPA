import {
    getFirestore,
    type Firestore,
} from 'firebase/firestore/lite';

import { getFirebaseApp } from './firebase';

/**
 * Obtiene Firestore Lite asociado a la aplicación
 * Firebase predeterminada.
 * Reutiliza la inicialización centralizada existente.
 */
export function getFirestoreDb(): Firestore {
    return getFirestore(getFirebaseApp());
}
