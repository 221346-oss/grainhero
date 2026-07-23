import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getDatabase, Database } from 'firebase-admin/database';
import { getStorage, Storage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;
let adminRealtimeDb: Database;
let adminStorage: Storage;

/**
 * Initialize Firebase Admin SDK
 * This should only be called on the server side
 */
export function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    try {
      // Read service account from file
      const serviceAccountPath = path.join(process.cwd(), 'smart-silo-service-account.json');
      
      if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`Service account file not found at: ${serviceAccountPath}`);
      }

      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
        storageBucket: `${serviceAccount.project_id}.appspot.com`,
      });

      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      throw error;
    }
  }

  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
  adminRealtimeDb = getDatabase(adminApp);
  adminStorage = getStorage(adminApp);

  return {
    app: adminApp,
    auth: adminAuth,
    db: adminDb,
    realtimeDb: adminRealtimeDb,
    storage: adminStorage,
  };
}

/**
 * Get Firebase Admin services
 * Initializes if not already initialized
 */
export function getFirebaseAdmin() {
  if (!adminApp) {
    return initializeFirebaseAdmin();
  }

  return {
    app: adminApp,
    auth: adminAuth,
    db: adminDb,
    realtimeDb: adminRealtimeDb,
    storage: adminStorage,
  };
}

export { adminApp, adminAuth, adminDb, adminRealtimeDb, adminStorage };
