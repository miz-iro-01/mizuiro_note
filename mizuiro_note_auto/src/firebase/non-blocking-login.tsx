'use client';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

import { getAdditionalUserInfo } from 'firebase/auth';

/** Initiate Google sign-in (non-blocking) and save access token for integrations. */
export function initiateGoogleSignIn(
  authInstance: Auth, 
  slotId: string = "1", 
  onComplete?: (isNewUser: boolean, user: any, success: boolean, msg?: string) => void
): void {
  const provider = new GoogleAuthProvider();
  // Add Blogger scope to request permission to manage blogs
  provider.addScope('https://www.googleapis.com/auth/blogger');
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline',
  });
  
  signInWithPopup(authInstance, provider).then((result: any) => {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    const refreshToken = result._tokenResponse?.oauthRefreshToken;
    
    // This is the key piece to detect if they just created the account
    const additionalInfo = getAdditionalUserInfo(result);
    const isNewUser = additionalInfo?.isNewUser || false;

    if (token) {
      const db = getFirestore();
      const slotRef = doc(db, 'users', result.user.uid, 'studioProfiles', slotId);
      const userRef = doc(db, 'users', result.user.uid);
      
      const bloggerData: any = {
        accessToken: token,
        updatedAt: serverTimestamp(),
        isConnected: true
      };
      if (refreshToken) bloggerData.refreshToken = refreshToken;
      
      setDoc(slotRef, {
        integrations: { blogger: bloggerData },
        bloggerAccessToken: token,
        updatedAt: serverTimestamp()
      }, { merge: true }).then(() => {
        if (onComplete) onComplete(isNewUser, result.user, true);
        else alert('Bloggerとの連携（トークン更新）が完了しました！投稿をお試しください。');
      }).catch(err => {
        if (onComplete) onComplete(false, null, false, err.message);
        else alert('データベースの更新に失敗しました: ' + err.message);
      });

      setDoc(userRef, {
        integrations: { blogger: bloggerData }
      }, { merge: true });
    } else {
      if (onComplete) onComplete(false, null, false, 'アクセストークンが取得できませんでした。');
      else alert('アクセストークンが取得できませんでした。');
    }
  }).catch((error) => {
    console.error('Google Sign-in Error:', error);
    if (onComplete) onComplete(false, null, false, error.message);
    else alert('Googleログインエラー: ' + error.message);
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  // CRITICAL: Call createUserWithEmailAndPassword directly. Do NOT use 'await createUserWithEmailAndPassword(...)'.
  createUserWithEmailAndPassword(authInstance, email, password);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  // CRITICAL: Call signInWithEmailAndPassword directly. Do NOT use 'await signInWithEmailAndPassword(...)'.
  signInWithEmailAndPassword(authInstance, email, password);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}
