import * as admin from 'firebase-admin';

// クライアント側と同じFirebaseプロジェクトID
const PROJECT_ID = 'studio-5142474284-ef60d';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_ID,
    });
  } catch (error) {
    console.warn('Firebase Admin Error: Could not initialize with applicationDefault. Trying fallback without credential object.');
    admin.initializeApp({
      projectId: PROJECT_ID,
    });
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

