import { getAuth } from 'firebase/auth';

import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore/lite';

import { getFirebaseApp } from '../lib/firebase';
import { getFirestoreDb } from '../lib/firestore';

export interface ProfileContact {
    phone: string;
    address: string;
}

export const EMPTY_PROFILE_CONTACT: ProfileContact = {
    phone: '',
    address: '',
};

function requireVerifiedOwner(uid: string): void {
    const currentUser = getAuth(
        getFirebaseApp(),
    ).currentUser;

    if (
        !uid ||
        !currentUser ||
        currentUser.uid !== uid ||
        !currentUser.emailVerified
    ) {
        throw new Error(
            'Debes iniciar sesión con tu cuenta verificada para gestionar tus datos de contacto.',
        );
    }
}

function contactDocument(uid: string) {
    return doc(
        getFirestoreDb(),
        'users',
        uid,
        'profile',
        'contact',
    );
}

/**
 * Normaliza y valida los datos opcionales.
 *
 * No se almacena información de autenticación.
 */
export function validateProfileContact(
    values: ProfileContact,
): ProfileContact {
    const phone = values.phone
        .trim()
        .replace(/\s+/g, ' ');

    const address = values.address
        .trim()
        .replace(/\s+/g, ' ');

    const digitCount = (
        phone.match(/[0-9]/g) ?? []
    ).length;

    if (
        phone &&
        (
            phone.length > 30 ||
            !/^[+0-9() .-]+$/.test(phone) ||
            digitCount < 7 ||
            digitCount > 15
        )
    ) {
        throw new Error(
            'Introduce un teléfono válido de 7 a 15 dígitos. Puedes utilizar +, espacios, puntos, paréntesis y guiones.',
        );
    }

    if (address.length > 240) {
        throw new Error(
            'La dirección no debe superar los 240 caracteres.',
        );
    }

    return { phone, address };
}

/**
 * Recupera la información de contacto del
 * propietario. Si no existe, devuelve campos
 * vacíos; no crea documentos innecesarios.
 */
export async function getProfileContact(
    uid: string,
): Promise<ProfileContact> {
    requireVerifiedOwner(uid);

    const snapshot = await getDoc(
        contactDocument(uid),
    );

    if (!snapshot.exists()) {
        return { ...EMPTY_PROFILE_CONTACT };
    }

    const data = snapshot.data();

    return {
        phone:
            typeof data.phone === 'string'
                ? data.phone
                : '',
        address:
            typeof data.address === 'string'
                ? data.address
                : '',
    };
}

/**
 * Guarda los datos normalizados.
 *
 * El momento de actualización lo determina
 * Firestore, no el reloj del navegador.
 */
export async function saveProfileContact(
    uid: string,
    values: ProfileContact,
): Promise<ProfileContact> {
    requireVerifiedOwner(uid);

    const normalized = validateProfileContact(
        values,
    );

    await setDoc(
        contactDocument(uid),
        {
            ...normalized,
            updatedAt: serverTimestamp(),
        },
    );

    return normalized;
}
