import { readFileSync } from 'node:fs';

import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

import {
    Timestamp,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore';

/*
 * MateCode SPA
 * Etapa 8 - Bloque 4B
 *
 * Pruebas de reglas reales de Firestore.
 * Ejecutar exclusivamente con el emulador.
 */

const PROJECT_ID = 'demo-matecode-rules-test';

const RULES = readFileSync(
    new URL('../firestore.rules', import.meta.url),
    'utf8',
);

const CONTACT_PATH = 'users/alice/profile/contact';

type TestEnvironment = Awaited<
    ReturnType<typeof initializeTestEnvironment>
>;

let testEnv: TestEnvironment;

function verifiedDb(uid = 'alice') {
    return testEnv
        .authenticatedContext(uid, {
            email_verified: true,
        })
        .firestore();
}

function unverifiedDb(uid = 'alice') {
    return testEnv
        .authenticatedContext(uid, {
            email_verified: false,
        })
        .firestore();
}

function anonymousDb() {
    return testEnv
        .unauthenticatedContext()
        .firestore();
}

function validContact() {
    return {
        phone: '+52 33 1234 5678',
        address: 'Calle 10',
        updatedAt: serverTimestamp(),
    };
}

/*
 * Inserta documentos de prueba sin aplicar
 * reglas para preparar los casos negativos.
 */
async function seedContact() {
    await testEnv.withSecurityRulesDisabled(
        async (context) => {
            await setDoc(
                doc(
                    context.firestore(),
                    CONTACT_PATH,
                ),
                {
                    phone: '+52 33 1234 5678',
                    address: 'Calle 10',
                    updatedAt: Timestamp.fromMillis(1000),
                },
            );
        },
    );
}

describe(
    'Reglas de Firestore: perfil y contacto',
    () => {
        beforeAll(async () => {
            testEnv = await initializeTestEnvironment({
                projectId: PROJECT_ID,
                firestore: {
                    host: '127.0.0.1',
                    port: 8080,
                    rules: RULES,
                },
            });
        });

        beforeEach(async () => {
            await testEnv.clearFirestore();
        });

        afterAll(async () => {
            if (testEnv) {
                await testEnv.cleanup();
            }
        });

        it(
            'permite crear y consultar datos al propietario verificado',
            async () => {
                const db = verifiedDb();

                await assertSucceeds(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        validContact(),
                    ),
                );

                const snapshot = await assertSucceeds(
                    getDoc(doc(db, CONTACT_PATH)),
                );

                expect(snapshot.exists()).toBe(true);

                expect(snapshot.data()?.phone).toBe(
                    '+52 33 1234 5678',
                );

                expect(snapshot.data()?.address).toBe(
                    'Calle 10',
                );
            },
        );

        it(
            'permite actualizar datos al propietario verificado',
            async () => {
                await seedContact();

                const db = verifiedDb();

                await assertSucceeds(
                    updateDoc(
                        doc(db, CONTACT_PATH),
                        {
                            phone: '+52 33 9999 8888',
                            updatedAt: serverTimestamp(),
                        },
                    ),
                );

                const snapshot = await assertSucceeds(
                    getDoc(doc(db, CONTACT_PATH)),
                );

                expect(snapshot.data()?.phone).toBe(
                    '+52 33 9999 8888',
                );
            },
        );

        it(
            'permite dejar teléfono y dirección vacíos',
            async () => {
                await assertSucceeds(
                    setDoc(
                        doc(verifiedDb(), CONTACT_PATH),
                        {
                            phone: '',
                            address: '',
                            updatedAt: serverTimestamp(),
                        },
                    ),
                );
            },
        );

        /*
         * NUEVAS PRUEBAS DE REGRESIÓN
         *
         * Deben coincidir con la validación
         * de firestoreProfileService.ts.
         */

        it(
            'acepta exactamente siete dígitos',
            async () => {
                const db = verifiedDb();

                await assertSucceeds(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        {
                            phone: '1234567',
                            address: '',
                            updatedAt: serverTimestamp(),
                        },
                    ),
                );

                const snapshot = await assertSucceeds(
                    getDoc(doc(db, CONTACT_PATH)),
                );

                expect(snapshot.data()?.phone).toBe(
                    '1234567',
                );
            },
        );

        it(
            'acepta exactamente quince dígitos',
            async () => {
                await seedContact();

                const db = verifiedDb();

                await assertSucceeds(
                    updateDoc(
                        doc(db, CONTACT_PATH),
                        {
                            phone: '+123 456 789 012 345',
                            updatedAt: serverTimestamp(),
                        },
                    ),
                );

                const snapshot = await assertSucceeds(
                    getDoc(doc(db, CONTACT_PATH)),
                );

                expect(snapshot.data()?.phone).toBe(
                    '+123 456 789 012 345',
                );
            },
        );

        it(
            'rechaza seis dígitos al crear y actualizar',
            async () => {
                const db = verifiedDb();

                await assertFails(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        {
                            phone: '123456',
                            address: '',
                            updatedAt: serverTimestamp(),
                        },
                    ),
                );

                await seedContact();

                await assertFails(
                    updateDoc(
                        doc(db, CONTACT_PATH),
                        {
                            phone: '123456',
                            updatedAt: serverTimestamp(),
                        },
                    ),
                );
            },
        );

        it(
            'rechaza dieciséis dígitos al crear y actualizar',
            async () => {
                const db = verifiedDb();

                await assertFails(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        {
                            phone: '1234567890123456',
                            address: '',
                            updatedAt: serverTimestamp(),
                        },
                    ),
                );

                await seedContact();

                await assertFails(
                    updateDoc(
                        doc(db, CONTACT_PATH),
                        {
                            phone: '1234567890123456',
                            updatedAt: serverTimestamp(),
                        },
                    ),
                );
            },
        );

        /*
         * PRUEBAS DE SEGURIDAD EXISTENTES
         */

        it(
            'rechaza lectura y escritura sin autenticación',
            async () => {
                const db = anonymousDb();

                await assertFails(
                    getDoc(doc(db, CONTACT_PATH)),
                );

                await assertFails(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        validContact(),
                    ),
                );
            },
        );

        it(
            'rechaza usuarios sin correo verificado',
            async () => {
                await seedContact();

                const db = unverifiedDb();

                await assertFails(
                    getDoc(doc(db, CONTACT_PATH)),
                );

                await assertFails(
                    updateDoc(
                        doc(db, CONTACT_PATH),
                        {
                            phone: '5551234567',
                            updatedAt: serverTimestamp(),
                        },
                    ),
                );

                await assertFails(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        validContact(),
                    ),
                );
            },
        );

        it(
            'impide leer o modificar perfiles ajenos',
            async () => {
                await seedContact();

                const bob = verifiedDb('bob');

                await assertFails(
                    getDoc(doc(bob, CONTACT_PATH)),
                );

                await assertFails(
                    updateDoc(
                        doc(bob, CONTACT_PATH),
                        {
                            phone: '5551234567',
                            updatedAt: serverTimestamp(),
                        },
                    ),
                );

                await assertFails(
                    setDoc(
                        doc(bob, CONTACT_PATH),
                        validContact(),
                    ),
                );
            },
        );

        it(
            'impide enumerar documentos de perfil',
            async () => {
                await seedContact();

                await assertFails(
                    getDocs(
                        collection(
                            verifiedDb(),
                            'users',
                            'alice',
                            'profile',
                        ),
                    ),
                );
            },
        );

        it(
            'impide eliminar documentos de contacto',
            async () => {
                await seedContact();

                await assertFails(
                    deleteDoc(
                        doc(
                            verifiedDb(),
                            CONTACT_PATH,
                        ),
                    ),
                );
            },
        );

        it(
            'rechaza campos adicionales no autorizados',
            async () => {
                const db = verifiedDb();

                await assertFails(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        {
                            ...validContact(),
                            password: 'dato-prohibido',
                        },
                    ),
                );

                await assertFails(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        {
                            ...validContact(),
                            role: 'admin',
                        },
                    ),
                );
            },
        );

        it(
            'rechaza documentos incompletos o tipos incorrectos',
            async () => {
                const db = verifiedDb();

                await assertFails(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        {
                            phone: '+52 33 1234 5678',
                            updatedAt: serverTimestamp(),
                        },
                    ),
                );

                await assertFails(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        {
                            phone: 12345678,
                            address: 'Calle 10',
                            updatedAt: serverTimestamp(),
                        },
                    ),
                );
            },
        );

        it(
            'rechaza caracteres y longitudes inválidas',
            async () => {
                const db = verifiedDb();

                await assertFails(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        {
                            ...validContact(),
                            phone: 'telefono-invalido',
                        },
                    ),
                );

                await assertFails(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        {
                            ...validContact(),
                            phone: '1'.repeat(31),
                        },
                    ),
                );

                await assertFails(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        {
                            ...validContact(),
                            address: 'A'.repeat(241),
                        },
                    ),
                );
            },
        );

        it(
            'rechaza fechas de actualización arbitrarias',
            async () => {
                const db = verifiedDb();

                await assertFails(
                    setDoc(
                        doc(db, CONTACT_PATH),
                        {
                            phone: '5551234567',
                            address: 'Calle 10',
                            updatedAt: Timestamp.fromMillis(1000),
                        },
                    ),
                );

                await seedContact();

                await assertFails(
                    updateDoc(
                        doc(db, CONTACT_PATH),
                        {
                            address: 'Dirección alterada',
                            updatedAt: Timestamp.fromMillis(2000),
                        },
                    ),
                );
            },
        );
    },
);
