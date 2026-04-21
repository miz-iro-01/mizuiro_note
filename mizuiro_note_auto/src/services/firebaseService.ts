import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase-legacy';
import { CharacterSettings, ThreadsAccount, Schedule, PostLog, UserConfig } from '../types';

/**
 * Firebase Service
 * This service encapsulates all Firestore operations for the Threads automation app.
 * Use this to maintain a clean separation between UI and data persistence.
 */
export const firebaseService = {
  // --- User Configuration ---
  
  /**
   * Sync user global configuration (timezone, API keys, etc.)
   */
  subscribeToUserConfig: (userId: string, callback: (config: UserConfig | null) => void) => {
    const docRef = doc(db, 'users', userId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserConfig);
      } else {
        callback(null);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}`));
  },

  /**
   * Update user global configuration
   */
  updateUserConfig: async (userId: string, data: Partial<UserConfig>) => {
    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  },

  // --- Characters ---

  /**
   * Subscribe to the user's AI characters
   */
  subscribeToCharacters: (userId: string, callback: (chars: CharacterSettings[]) => void) => {
    const colRef = collection(db, 'users', userId, 'characters');
    return onSnapshot(colRef, (snapshot) => {
      const chars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharacterSettings));
      callback(chars);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/characters`));
  },

  /**
   * Add a new AI character
   */
  addCharacter: async (userId: string, char: Omit<CharacterSettings, 'id'>) => {
    try {
      const colRef = collection(db, 'users', userId, 'characters');
      const docRef = await addDoc(colRef, char);
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}/characters`);
    }
  },

  /**
   * Update an existing AI character
   */
  updateCharacter: async (userId: string, charId: string, data: Partial<CharacterSettings>) => {
    try {
      const docRef = doc(db, 'users', userId, 'characters', charId);
      await updateDoc(docRef, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/characters/${charId}`);
    }
  },

  /**
   * Delete an AI character
   */
  deleteCharacter: async (userId: string, charId: string) => {
    try {
      const docRef = doc(db, 'users', userId, 'characters', charId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/characters/${charId}`);
    }
  },

  // --- Threads Accounts ---

  /**
   * Subscribe to linked Threads accounts
   */
  subscribeToAccounts: (userId: string, callback: (accounts: ThreadsAccount[]) => void) => {
    const colRef = collection(db, 'users', userId, 'accounts');
    return onSnapshot(colRef, (snapshot) => {
      const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThreadsAccount));
      callback(accounts);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/accounts`));
  },

  /**
   * Add a linked Threads account
   */
  addAccount: async (userId: string, account: Omit<ThreadsAccount, 'id'>) => {
    try {
      const colRef = collection(db, 'users', userId, 'accounts');
      const docRef = await addDoc(colRef, {
        ...account,
        createdAt: serverTimestamp(),
        lastRefreshedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}/accounts`);
    }
  },

  /**
   * Update a Threads account (e.g., refreshing token)
   */
  updateAccount: async (userId: string, accId: string, data: Partial<ThreadsAccount>) => {
    try {
      const docRef = doc(db, 'users', userId, 'accounts', accId);
      await updateDoc(docRef, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/accounts/${accId}`);
    }
  },

  /**
   * Unlink a Threads account
   */
  deleteAccount: async (userId: string, accId: string) => {
    try {
      const docRef = doc(db, 'users', userId, 'accounts', accId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/accounts/${accId}`);
    }
  },

  // --- Automation Schedules ---

  /**
   * Subscribe to automation schedules
   */
  subscribeToAutomations: (userId: string, callback: (schedules: Schedule[]) => void) => {
    const colRef = collection(db, 'users', userId, 'automations');
    return onSnapshot(colRef, (snapshot) => {
      const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
      callback(schedules);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/automations`));
  },

  /**
   * Add a new automation schedule
   */
  addAutomation: async (userId: string, schedule: Omit<Schedule, 'id'>) => {
    try {
      const colRef = collection(db, 'users', userId, 'automations');
      const docRef = await addDoc(colRef, schedule);
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}/automations`);
    }
  },

  /**
   * Update an automation schedule
   */
  updateAutomation: async (userId: string, schedId: string, data: Partial<Schedule>) => {
    try {
      const docRef = doc(db, 'users', userId, 'automations', schedId);
      await updateDoc(docRef, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/automations/${schedId}`);
    }
  },

  /**
   * Delete an automation schedule
   */
  deleteAutomation: async (userId: string, schedId: string) => {
    try {
      const docRef = doc(db, 'users', userId, 'automations', schedId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/automations/${schedId}`);
    }
  },

  // --- Logs ---

  /**
   * Subscribe to post history logs
   */
  subscribeToLogs: (userId: string, callback: (logs: PostLog[]) => void) => {
    const colRef = collection(db, 'users', userId, 'logs');
    const q = query(colRef, orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostLog));
      callback(logs);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/logs`));
  },

  /**
   * Add a post log entry
   */
  addLog: async (userId: string, log: Omit<PostLog, 'id'>) => {
    try {
      const colRef = collection(db, 'users', userId, 'logs');
      await addDoc(colRef, {
        ...log,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/logs`);
    }
  },

  /**
   * Clear all logs (for admin or user cleanup)
   */
  clearLogs: async (userId: string, logIds: string[]) => {
    try {
      // Note: Firestore doesn't support bulk delete in client SDK easily without batching
      // For simplicity, we delete them one by one or suggest a cloud function
      const promises = logIds.map(id => deleteDoc(doc(db, 'users', userId, 'logs', id)));
      await Promise.all(promises);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/logs`);
    }
  }
};
