import { getFirestore, type Firestore } from 'firebase/firestore';

import { getFirebaseApp } from './firebase';

/**
 * Obtiene Firestore asociado a la aplicación Firebase predeterminada.
 * Reutiliza la inicialización centralizada existente.
 */
export function getFirestoreDb(): Firestore {
    return getFirestore(getFirebaseApp());
}
