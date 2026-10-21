import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import type { AppConfig } from '../config/appConfig';

export interface FirebaseClients {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
}

let clients: FirebaseClients | null = null;

/** Inicializa Firebase una sola vez. En modo demo no se llama nunca. */
export function getFirebaseClients(config: AppConfig): FirebaseClients {
  if (clients) return clients;
  if (!config.firebase) throw new Error('Firebase no está configurado (modo demo)');
  const app = initializeApp(config.firebase);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, config.functionsRegion);
  if (config.mode === 'emulators') {
    const host = config.emulatorHost;
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectFunctionsEmulator(functions, host, 5001);
  }
  clients = { app, auth, db, functions };
  return clients;
}
