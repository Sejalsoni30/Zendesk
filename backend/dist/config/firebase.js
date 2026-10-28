import admin from 'firebase-admin';
import { config } from './env.js';
let app;
if (admin.apps.length > 0) {
    app = admin.apps[0];
}
else {
    // Check if credentials are provided via JSON string in environment variable
    let credential = admin.credential.applicationDefault();
    if (config.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
            const serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_JSON);
            credential = admin.credential.cert(serviceAccount);
        }
        catch (err) {
            console.warn('⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON, falling back to default/emulator credentials');
        }
    }
    // When connecting to emulators, no real credentials are required.
    // The Firebase Admin SDK automatically detects FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST.
    app = admin.initializeApp({
        projectId: config.FIREBASE_PROJECT_ID,
        credential,
    });
}
export const db = admin.firestore(app);
export const auth = admin.auth(app);
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
// Helper to verify emulator connectivity with bounded timeout
export async function checkFirestoreConnection(timeoutMs = 1500) {
    try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore connection timed out')), timeoutMs));
        // Race the Firestore get request against the timeout
        await Promise.race([
            db.collection('_health').doc('ping').get(),
            timeoutPromise,
        ]);
        return true;
    }
    catch (error) {
        return false;
    }
}
