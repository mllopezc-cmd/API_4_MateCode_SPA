import {
    getApps,
    initializeApp,
    type FirebaseApp,
} from 'firebase/app';

import { getFirebaseConfig } from './firebaseConfig';

export function getFirebaseApp(): FirebaseApp {
    const existingApp = getApps().find(
        (app) => app.name === '[DEFAULT]',
    );

    if (existingApp) {
        return existingApp;
    }

    return initializeApp(getFirebaseConfig());
}