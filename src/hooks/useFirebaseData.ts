import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';
import { firebaseService } from '../services/firebaseService';
import { CharacterSettings, ThreadsAccount, Schedule, PostLog, UserConfig } from '../types';

/**
 * useFirebaseData Hook
 * Manages all real-time data synchronization between Firestore and the React app.
 * This hook handles authentication state and sets up listeners for all collections.
 */
export const useFirebaseData = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data States
  const [characters, setCharacters] = useState<CharacterSettings[]>([]);
  const [accounts, setAccounts] = useState<ThreadsAccount[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<PostLog[]>([]);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);

  // Refs for background processes (like the auto-poster)
  const charactersRef = useRef<CharacterSettings[]>([]);
  const accountsRef = useRef<ThreadsAccount[]>([]);
  const schedulesRef = useRef<Schedule[]>([]);
  const userRef = useRef<User | null>(null);

  // Update refs whenever state changes
  useEffect(() => { charactersRef.current = characters; }, [characters]);
  useEffect(() => { accountsRef.current = accounts; }, [accounts]);
  useEffect(() => { schedulesRef.current = schedules; }, [schedules]);
  useEffect(() => { userRef.current = user; }, [user]);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Listeners (only when authenticated)
  useEffect(() => {
    if (!user) {
      setCharacters([]);
      setAccounts([]);
      setSchedules([]);
      setLogs([]);
      setUserConfig(null);
      return;
    }

    // Set up all listeners
    const unsubConfig = firebaseService.subscribeToUserConfig(user.uid, setUserConfig);
    const unsubChars = firebaseService.subscribeToCharacters(user.uid, setCharacters);
    const unsubAccounts = firebaseService.subscribeToAccounts(user.uid, setAccounts);
    const unsubAutomations = firebaseService.subscribeToAutomations(user.uid, setSchedules);
    const unsubLogs = firebaseService.subscribeToLogs(user.uid, setLogs);

    // Cleanup all listeners on unmount or logout
    return () => {
      unsubConfig();
      unsubChars();
      unsubAccounts();
      unsubAutomations();
      unsubLogs();
    };
  }, [user]);

  return {
    user,
    isAuthReady,
    loading,
    characters,
    accounts,
    schedules,
    logs,
    userConfig,
    // Refs for background tasks
    charactersRef,
    accountsRef,
    schedulesRef,
    userRef
  };
};
