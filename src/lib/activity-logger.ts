import { collection, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

interface ActivityLog {
  userId: string;
  platform: 'blogger' | 'threads' | 'pinterest' | 'wordpress' | 'hatena';
  productName: string;
  itemPrice: number;
  itemUrl: string;
  imageUrl: string;
  status: 'success' | 'failed';
  error?: string;
  postTitle?: string;
  postContent?: string;
}

/**
 * すでにセキュリティルールで許可されている 'posts' サブコレクションにログを保存します
 */
export async function logActivity(activity: ActivityLog) {
  try {
    // すでに権限がある 'posts' コレクションを使用
    const postsRef = collection(db, 'users', activity.userId, 'posts');
    await addDoc(postsRef, {
      ...activity,
      // 旧コードとの互換性のため一部フィールドをエイリアス
      topic: activity.postTitle || activity.productName,
      postText: activity.postContent || '',
      createdAt: serverTimestamp(),
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export async function deleteActivity(userId: string, activityId: string) {
  try {
    // posts コレクションのドキュメントを削除
    const docRef = doc(db, 'users', userId, 'posts', activityId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Failed to delete activity:', error);
    throw error;
  }
}
