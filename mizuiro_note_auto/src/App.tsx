/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Send, 
  Sparkles, 
  LogOut, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  MessageSquare,
  ImageIcon,
  Settings as SettingsIcon,
  User as UserIcon,
  LayoutDashboard,
  Key,
  Save,
  ArrowRight,
  Zap,
  Palette,
  Trash2,
  Plus,
  Clock,
  Shuffle,
  ChevronRight,
  HelpCircle,
  X,
  CreditCard,
  Check,
  Link as LinkIcon,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  signIn, 
  signOut, 
  handleFirestoreError, 
  OperationType 
} from './firebase-legacy';
import { useFirebaseData } from './hooks/useFirebaseData';
import { firebaseService } from './services/firebaseService';
import { 
  CharacterSettings, 
  ThreadsAccount, 
  Schedule, 
  PostLog, 
  UserConfig 
} from './types';
import { serverTimestamp } from 'firebase/firestore';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "予期せぬエラーが発生しました。";
      try {
        const errorStr = this.state.error?.message || "";
        if (errorStr.startsWith('{')) {
          const parsed = JSON.parse(errorStr);
          displayMessage = `Firestoreエラー: ${parsed.error} (操作: ${parsed.operationType}, パス: ${parsed.path})`;
        } else {
          displayMessage = errorStr || displayMessage;
        }
      } catch (e) {
        // Fallback to default message
      }

      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-lg w-full space-y-6 border border-red-100">
            <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-black text-red-900">エラーが発生しました</h1>
              <p className="text-sm text-red-600 font-medium leading-relaxed">
                {displayMessage}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 transition-all shadow-lg shadow-red-200"
            >
              再読み込みする
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Types
type View = 'landing' | 'dashboard' | 'content' | 'character' | 'settings' | 'automation' | 'history';

const SchedulePromptInput = ({ schedule, onUpdate }: { schedule: Schedule, onUpdate: (id: string, value: string) => void }) => {
  const [localValue, setLocalValue] = useState(schedule.prompt || "");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(schedule.prompt || "");
    }
  }, [schedule.prompt, isFocused]);

  return (
    <textarea 
      value={localValue}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        onUpdate(schedule.id, localValue);
      }}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder="空欄の場合はキャラ設定から自動生成"
      className="w-full bg-black/5 border-none rounded-lg text-sm font-bold p-2 h-20 resize-none"
    />
  );
};

export default function App() {
  const {
    user,
    isAuthReady,
    loading: dataLoading,
    characters,
    accounts,
    schedules,
    logs,
    userConfig,
    charactersRef,
    accountsRef,
    schedulesRef,
    userRef
  } = useFirebaseData();

  const [view, setView] = useState<View>('landing');
  const [userGeminiKey, setUserGeminiKey] = useState("");
  const [userTimezone, setUserTimezone] = useState("Asia/Tokyo");
  const [isPaid, setIsPaid] = useState(false);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [tempSchedule, setTempSchedule] = useState<Schedule | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState<string | null>(null);
  const [selectedCharId, setSelectedCharId] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [tempChar, setTempChar] = useState<CharacterSettings | null>(null);
  const [isEditingChar, setIsEditingChar] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [tokenUpdateAccId, setTokenUpdateAccId] = useState<string | null>(null);
  const [newTokenValue, setNewTokenValue] = useState("");
  const [authCodeUrl, setAuthCodeUrl] = useState("");
  const [isExchanging, setIsExchanging] = useState(false);
  const [threadsClientId, setThreadsClientId] = useState("");
  const [threadsClientSecret, setThreadsClientSecret] = useState("");
  const [draftThreadsClientId, setDraftThreadsClientId] = useState("");
  const [draftThreadsClientSecret, setDraftThreadsClientSecret] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [deleteConfirmAccId, setDeleteConfirmAccId] = useState<string | null>(null);
  const [manualAccount, setManualAccount] = useState({ threadsToken: '', threadsUserId: '', accountName: '' });
  const [postText, setPostText] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showHistoryDeleteConfirm, setShowHistoryDeleteConfirm] = useState(false);

  // Refs for auto-poster
  const userGeminiKeyRef = useRef<string>("");
  const userTimezoneRef = useRef<string>("Asia/Tokyo");

  useEffect(() => {
    if (userConfig) {
      setUserGeminiKey(userConfig.geminiKey || "");
      setUserTimezone(userConfig.timezone || "Asia/Tokyo");
      setIsPaid(userConfig.isPaid || false);
      setUserCreatedAt(userConfig.createdAt || null);
      setThreadsClientId(userConfig.threadsClientId || "");
      setThreadsClientSecret(userConfig.threadsClientSecret || "");
      setDraftThreadsClientId(userConfig.threadsClientId || "");
      setDraftThreadsClientSecret(userConfig.threadsClientSecret || "");
    }
  }, [userConfig]);

  useEffect(() => { userGeminiKeyRef.current = userGeminiKey; }, [userGeminiKey]);
  useEffect(() => { userTimezoneRef.current = userTimezone; }, [userTimezone]);

  useEffect(() => {
    if (isAuthReady) {
      if (user && view === 'landing') setView('dashboard');
      if (!user) setView('landing');
    }
  }, [isAuthReady, user]);

  // Auto-select first character/account if none selected
  useEffect(() => {
    if (characters.length > 0 && !selectedCharId) {
      setSelectedCharId(characters[0].id);
    }
  }, [characters, selectedCharId]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const isTrialActive = useMemo(() => {
    if (!userCreatedAt) return true;
    const created = new Date(userCreatedAt).getTime();
    const now = new Date().getTime();
    const diffDays = (now - created) / (1000 * 60 * 60 * 24);
    return diffDays < 7;
  }, [userCreatedAt]);

  // Token Auto-Refresh Logic
  useEffect(() => {
    const refreshTokens = async () => {
      if (!user || accounts.length === 0) return;
      
      const now = new Date();
      for (const account of accounts) {
        // Refresh if lastRefreshedAt is missing or older than 30 days
        let shouldRefresh = false;
        if (!account.lastRefreshedAt) {
          shouldRefresh = true;
        } else {
          const lastRefreshed = account.lastRefreshedAt.toDate();
          const diffDays = (now.getTime() - lastRefreshed.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) {
            shouldRefresh = true;
          }
        }

        if (shouldRefresh) {
          try {
            console.log(`[Token Refresh] Attempting to refresh token for account ${account.accountName}`);
            const res = await fetch(`https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${account.threadsToken}`);
            const data = await res.json();
            
            if (data.access_token) {
              await firebaseService.updateAccount(user.uid, account.id, { 
                threadsToken: data.access_token,
                lastRefreshedAt: serverTimestamp() as any
              });
              console.log(`[Token Refresh] Successfully refreshed token for account ${account.accountName}`);
            } else {
              console.warn(`[Token Refresh] Failed to refresh token for account ${account.accountName}:`, data);
            }
          } catch (err) {
            console.error(`[Token Refresh] Error refreshing token for account ${account.accountName}:`, err);
          }
        }
      }
    };

    refreshTokens();
  }, [user, accounts.length]); // Run when accounts are loaded

  // Client-side Auto-Posting Engine
  useEffect(() => {
    const checkSchedules = async () => {
      const now = new Date();
      const timezone = userTimezoneRef.current;
      
      // Get current time in user's timezone
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        weekday: 'short'
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(now);
      const currentHour = parts.find(p => p.type === 'hour')?.value || '00';
      const currentMinute = parts.find(p => p.type === 'minute')?.value || '00';
      const currentTime = `${currentHour}:${currentMinute}`;
      const currentDayFull = parts.find(p => p.type === 'weekday')?.value.toLowerCase() || 'sun';
      const currentDay = currentDayFull.slice(0, 3); // 'sun', 'mon', etc.

      for (const schedule of schedulesRef.current) {
        if (!schedule.enabled) continue;
        const days = schedule.days || ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        if (!days.includes(currentDay)) continue;

        let shouldPost = false;
        if (schedule.type === 'fixed' && schedule.time === currentTime) {
          shouldPost = true;
        } else if (schedule.type === 'random') {
          // Simplified random logic for client-side: 
          // Chance to post per minute = frequency / (24 * 60)
          const chance = schedule.frequency / 1440;
          if (Math.random() < chance) {
            shouldPost = true;
          }
        }

        if (shouldPost) {
          const account = accountsRef.current.find(a => a.id === schedule.accountId);
          const character = charactersRef.current.find(c => c.id === schedule.characterId);
          const currentUser = userRef.current;
          const apiKey = userGeminiKeyRef.current || (import.meta as any).env.VITE_GEMINI_API_KEY;

          if (!account || !character || !currentUser || !apiKey) continue;

          console.log(`[Auto Post] Triggering schedule ${schedule.id}`);
          
          try {
            // 1. Generate Content
            const ai = new GoogleGenAI({ apiKey });
            const aiPrompt = `
あなたは「${character.name}」としてThreadsに投稿します。
以下の設定に厳密に従って、自然で魅力的な投稿を作成してください。

【キャラクター設定】
${character.basicInfo}

【一人称】
${character.firstPerson}

【語尾・口調】
${character.ending}

【投稿の傾向・スタイル】
${character.tendency}

【今回の投稿テーマ（あれば）】
${schedule.prompt || '日常のつぶやきや、あなたの設定に合った話題を一つ選んでください。'}

【投稿の条件】
- Threadsの投稿として自然な長さ（140〜300文字程度）にすること
- ハッシュタグは自然な形で1〜2個含めること
- 今の気分や季節感、空気感を少しだけ混ぜること
- 「今日は〇月〇日ですね」「今は〇時ですね」といった直接的な日時表現は絶対に避けること
- 絵文字はキャラクターの雰囲気に合わせて適度に使用すること
`;
            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: aiPrompt,
            });
            const generatedText = response.text;

            if (!generatedText) throw new Error("Generated text is empty");

            // 2. Post to Threads
            const res = await fetch('/api/threads/post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                text: generatedText,
                threadsUserId: account.threadsUserId,
                threadsToken: account.threadsToken
              })
            });
            
            let data;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
              data = await res.json();
            } else {
              throw new Error("サーバーから不正なレスポンスが返されました。");
            }

            // 3. Log Success
            const logData = {
              type: 'auto' as const,
              status: data.success ? 'success' as const : 'error' as const,
              text: generatedText,
              message: data.success ? '' : (data.error?.message || "Unknown error"),
              accountId: account.id,
              characterId: character.id
            };
            await firebaseService.addLog(currentUser.uid, logData);

          } catch (error: any) {
            console.error("[Auto Post] Error:", error);
            // Log Error
            const logData = {
              type: 'auto' as const,
              status: 'error' as const,
              text: 'Failed to generate or post content',
              message: error.message || "Unknown error",
              accountId: account.id,
              characterId: character.id
            };
            await firebaseService.addLog(currentUser.uid, logData);
          }
        }
      }
    };

    const intervalId = setInterval(checkSchedules, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, []);


  const exchangeCode = async () => {
    if (!authCodeUrl) return;
    if (!threadsClientId || !threadsClientSecret) {
      setStatus({ type: 'error', message: '先に「ThreadsアプリID」と「Threads app secret」を入力して保存してください。' });
      return;
    }
    setIsExchanging(true);
    setStatus({ type: 'success', message: '連携を完了しています...' });

    try {
      // Extract code from URL
      const urlStr = authCodeUrl.trim().replace('#_', '');
      let code = "";
      try {
        const url = new URL(urlStr);
        code = url.searchParams.get('code') || "";
      } catch (e) {
        // If not a valid URL, maybe it's just the code?
        code = urlStr;
      }
      
      if (!code) throw new Error("認証コードが見つかりません。URLを正しくコピーしてください。");

      const res = await fetch('/api/threads/exchange-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code,
          clientId: threadsClientId,
          clientSecret: threadsClientSecret,
          redirectUri: `${window.location.origin}/auth/callback`
        })
      });

      const data = await res.json();
      if (!data.success) {
        console.error("[Exchange Code] API Error:", data.error);
        throw new Error(data.error || "連携に失敗しました。Metaの設定やURLが正しいか確認してください。");
      }

      // Save to Firestore
      if (user) {
        try {
          await firebaseService.addAccount(user.uid, {
            threadsToken: data.data.threadsToken,
            threadsUserId: String(data.data.threadsUserId),
            accountName: data.data.accountName,
            profilePic: ""
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/accounts`);
        }
      }

      setStatus({ type: 'success', message: 'アカウントの連携に成功しました！' });
      setAuthCodeUrl("");
      setTimeout(() => setStatus(null), 5000);
    } catch (err: any) {
      console.error("[Exchange Code] Full Error:", err);
      let displayMessage = err.message || "エラーが発生しました。";
      
      // If it's a JSON error from handleFirestoreError, try to parse it
      try {
        if (displayMessage.startsWith('{')) {
          const parsed = JSON.parse(displayMessage);
          displayMessage = `Firestore権限エラー: ${parsed.error} (操作: ${parsed.operationType}, パス: ${parsed.path})`;
        }
      } catch (e) {
        // Not JSON, keep original message
      }
      
      setStatus({ type: 'error', message: displayMessage });
    } finally {
      setIsExchanging(false);
    }
  };


  // Sync tempChar with selected character
  useEffect(() => {
    if (selectedCharId) {
      const char = characters.find(c => c.id === selectedCharId);
      if (char && !isEditingChar) {
        setTempChar(char);
      }
    } else {
      setTempChar(null);
      setIsEditingChar(false);
    }
  }, [selectedCharId, characters, isEditingChar]);


  // Gemini Instance
  const ai = useMemo(() => {
    const key = userGeminiKey || (import.meta as any).env.VITE_GEMINI_API_KEY || "";
    return new GoogleGenAI({ apiKey: key });
  }, [userGeminiKey]);

  // OAuth Message Listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) return;
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.data) {
        linkThreadsAccount(event.data.data);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const linkThreadsAccount = async (data: { threadsToken: string, threadsUserId: string, username?: string, name?: string, profilePic?: string }) => {
    if (!user) return;
    if (accounts.length >= 3) {
      setStatus({ type: 'error', message: "連携できるアカウントは最大3つまでです。" });
      return;
    }

    try {
      await firebaseService.addAccount(user.uid, {
        threadsToken: data.threadsToken,
        threadsUserId: data.threadsUserId,
        accountName: data.username || data.name || `Account ${accounts.length + 1}`,
        profilePic: data.profilePic || ""
      });
      setStatus({ type: 'success', message: "Threadsアカウントを連携しました。" });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/accounts`);
    }
  };

  const handleConnect = () => {
    if (!threadsClientId) {
      setStatus({ type: 'error', message: '先に「ThreadsアプリID」をシステム設定で入力して保存してください。' });
      setView('settings');
      return;
    }
    const redirectUri = `${window.location.origin}/auth/callback`;
    const authUrl = `https://www.threads.net/oauth/authorize?client_id=${threadsClientId}&redirect_uri=${redirectUri}&scope=threads_content_publish,threads_basic&response_type=code`;
    window.open(authUrl, '_blank');
    setStatus({ type: 'success', message: 'Metaの認証画面を開きました。認証後、URLをコピーして下の入力欄に貼り付けてください。' });
  };

  const handleLogin = async () => {
    try {
      const result = await signIn();
      if (!result) {
        alert("ログインポップアップがブロックされました。ブラウザの設定を確認してください。");
      }
    } catch (err) {
      console.error("Login failed", err);
      alert("ログインに失敗しました。ポップアップがブロックされている可能性があります。");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setView('landing');
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const saveSystemConfig = async () => {
    if (!user) return;
    setIsSavingConfig(true);
    setStatus({ type: 'success', message: "設定を保存中..." });
    try {
      await firebaseService.updateUserConfig(user.uid, { 
        geminiKey: userGeminiKey,
        timezone: userTimezone,
        threadsClientId: draftThreadsClientId,
        threadsClientSecret: draftThreadsClientSecret
      });
      
      setThreadsClientId(draftThreadsClientId);
      setThreadsClientSecret(draftThreadsClientSecret);
      
      setStatus({ type: 'success', message: "設定を保存しました。これで連携が可能になります。" });
      setTimeout(() => setStatus(null), 5000);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: `保存に失敗しました` });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const updateCharacter = async () => {
    if (!user || !tempChar) return;
    try {
      const { id, ...data } = tempChar;
      await firebaseService.updateCharacter(user.uid, id, data);
      setStatus({ type: 'success', message: "キャラクター設定を保存しました。" });
      setIsEditingChar(false);
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const addCharacter = async () => {
    if (!user || characters.length >= 3) return;
    try {
      const newChar = {
        name: `新キャラ ${characters.length + 1}`,
        basicInfo: " ", 
        firstPerson: "僕",
        ending: "だよ！",
        tendency: " "
      };
      const id = await firebaseService.addCharacter(user.uid, newChar);
      if (id) {
        setSelectedCharId(id);
        setIsEditingChar(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCharacter = async (id: string) => {
    if (!user) return;
    try {
      await firebaseService.deleteCharacter(user.uid, id);
      if (selectedCharId === id) {
        setSelectedCharId("");
        setTempChar(null);
        setIsEditingChar(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addSchedule = async () => {
    if (!user || accounts.length === 0 || characters.length === 0) {
      setStatus({ type: 'error', message: "アカウントとキャラクターを先に設定してください。" });
      return;
    }
    try {
      const newSchedule = {
        type: 'fixed' as const,
        time: "09:00",
        characterId: characters[0].id,
        accountId: accounts[0].id,
        prompt: "",
        enabled: true,
        days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      };
      const id = await firebaseService.addAutomation(user.uid, newSchedule);
      if (id) {
        setEditingScheduleId(id);
        setTempSchedule({ id, ...newSchedule });
        setStatus({ type: 'success', message: "新しいスケジュールを追加しました。" });
        setTimeout(() => setStatus(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditingSchedule = (schedule: Schedule) => {
    setEditingScheduleId(schedule.id);
    setTempSchedule({ ...schedule });
  };

  const cancelEditingSchedule = () => {
    setEditingScheduleId(null);
    setTempSchedule(null);
  };

  const updateTempSchedule = (field: keyof Schedule, value: any) => {
    if (!tempSchedule) return;
    setTempSchedule(prev => prev ? { ...prev, [field]: value } : null);
  };

  const saveSchedule = async (id: string) => {
    if (!user || !tempSchedule) return;
    setIsSavingSchedule(id);
    try {
      const { id: _, ...updateValue } = tempSchedule;
      await firebaseService.updateAutomation(user.uid, id, updateValue);
      setEditingScheduleId(null);
      setTempSchedule(null);
      setStatus({ type: 'success', message: 'スケジュールを保存しました。' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: '保存に失敗しました。' });
    } finally {
      setIsSavingSchedule(null);
    }
  };

  const removeSchedule = async (id: string) => {
    if (!user) return;
    if (showDeleteConfirm === id) {
      try {
        await firebaseService.deleteAutomation(user.uid, id);
        setShowDeleteConfirm(null);
        if (editingScheduleId === id) {
          setEditingScheduleId(null);
          setTempSchedule(null);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setShowDeleteConfirm(id);
      setTimeout(() => setShowDeleteConfirm(null), 3000);
    }
  };

  const generateContent = async () => {
    if (!selectedCharId) {
      setStatus({ type: 'error', message: "キャラクターを選択してください。" });
      return;
    }
    if (!userGeminiKey && !process.env.GEMINI_API_KEY) {
      setStatus({ type: 'error', message: "APIキーを設定してください。" });
      setView('settings');
      return;
    }

    setIsGenerating(true);
    setStatus(null);
    try {
      const char = characters.find(c => c.id === selectedCharId);
      if (!char) throw new Error("キャラクターが見つかりません");

      const now = new Date();
      const dateStr = now.toLocaleDateString('ja-JP', { 
        timeZone: userTimezone, 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        weekday: 'long' 
      });
      const timeStr = now.toLocaleTimeString('ja-JP', { 
        timeZone: userTimezone, 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      const systemInstruction = `
        あなたは以下のキャラクターとしてThreadsの投稿を作成してください。
        
        【重要】現在は ${dateStr} ${timeStr} です。
        投稿内容は、この現在の日時（特に曜日や時間帯、季節感）に完全に合わせた内容にしてください。
        未来や過去の出来事としてではなく、今この瞬間の投稿として作成してください。
        
        【厳守ルール】
        ・「今日は木曜日です」「今は8時31分です」といった、当たり前の日時を直接説明することは【厳禁】です。
        ・「木曜日の夜」「明日は金曜日」といった表現も、文脈上不自然な場合は避けてください。
        ・代わりに、その時間帯の空気感、季節感、その瞬間の気分（例：「週末まであと少し」「夜風が気持ちいい」「ランチ何食べようかな」など）を自然に文章に織り交ぜてください。
        ・AIっぽさを消し、一人の人間がその瞬間に感じていることを呟いているようにしてください。
        
        【キャラクター設定】${char.basicInfo}
        【一人称】${char.firstPerson}
        【語尾】${char.ending}
        【傾向】${char.tendency}
      `;

      const promptText = prompt ? `以下のトピックについて投稿を作成してください：\n${prompt}` : "キャラクターの性格や傾向に合わせた、Threadsで共感を得られる日常的な投稿を1つ作成してください。";

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: promptText,
        config: { systemInstruction }
      });
      setPostText(result.text || "");
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: "コンテンツの生成に失敗しました。APIキーを確認してください。" });
    } finally {
      setIsGenerating(false);
    }
  };

  const submitPost = async () => {
    if (!postText || !selectedAccountId || !selectedCharId) return;
    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return;

    setIsPosting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/threads/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: postText,
          threadsUserId: account.threadsUserId,
          threadsToken: account.threadsToken
        })
      });
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("Non-JSON response from server:", text);
        throw new Error("サーバーから不正なレスポンスが返されました。");
      }
      
      const logData = {
        type: 'manual' as const,
        status: data.success ? 'success' as const : 'error' as const,
        text: postText,
        message: data.success ? '' : (data.error?.message || "Unknown error"),
        accountId: selectedAccountId,
        characterId: selectedCharId
      };

      await firebaseService.addLog(user!.uid, logData);
      
      if (data.success) {
        setStatus({ type: 'success', message: "Threadsへの投稿が完了しました！" });
        setPostText("");
        setGeneratedImage(null);
      } else {
        throw new Error(data.error?.message || "投稿に失敗しました。");
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsPosting(false);
    }
  };


  const clearHistory = async () => {
    if (!user || logs.length === 0) return;
    
    try {
      await firebaseService.clearLogs(user.uid, logs.map(l => l.id));
      setStatus({ type: 'success', message: "履歴を削除しました。" });
      setShowHistoryDeleteConfirm(false);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: "履歴の削除に失敗しました。" });
    }
  };
  const generateImage = async () => {
    if (!postText) return;
    setIsGeneratingImage(true);
    setStatus(null);
    try {
      const result = await ai.models.generateContent({
        model: "googleai/gemini-3-flash",
        contents: `以下の投稿内容に合う、Threadsに映える高品質な画像を生成してください：\n${postText}`,
      });
      
      const imagePart = result.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        setGeneratedImage(`data:image/png;base64,${imagePart.inlineData.data}`);
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: "画像の生成に失敗しました。" });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <RefreshCw className="w-8 h-8 animate-spin text-black/10" />
      </div>
    );
  }

  // --- Landing Page View ---
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-white text-[#141414]">
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center rotate-3">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-xl tracking-tighter">Threads Auto-Poster</span>
          </div>
          <button 
            onClick={user ? handleLogout : handleLogin}
            className="text-sm font-bold hover:opacity-70 transition-opacity"
          >
            {user ? 'ログアウト' : 'ログイン'}
          </button>
        </nav>

        <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 text-[11px] font-black uppercase tracking-widest">
                <Sparkles className="w-3 h-3" /> AI-Powered Threads Automation
              </div>
              <h1 className="text-7xl font-black tracking-tighter leading-[0.9]">
                あなたの分身が<br />
                <span className="text-black/60">Threadsを</span><br />
                自動投稿する。
              </h1>
              <p className="text-xl text-black/60 max-w-lg leading-relaxed">
                キャラクター設定、AI文章生成、そして自動投稿。
                次世代のSNS運用ツールで、あなたのブランドを加速させましょう。
              </p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={user ? () => setView('dashboard') : handleLogin}
                  className="bg-black text-white px-8 py-5 rounded-2xl font-bold text-lg flex items-center gap-2 hover:scale-105 transition-transform shadow-2xl shadow-black/20"
                >
                  {user ? 'ダッシュボードへ' : '今すぐ始める'} <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-[#F5F5F5] rounded-[4rem] overflow-hidden rotate-3 shadow-inner flex items-center justify-center p-12">
                <div className="w-full h-full bg-white rounded-3xl shadow-2xl border border-black/5 p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black/5 rounded-full" />
                    <div className="space-y-2">
                      <div className="w-24 h-3 bg-black/10 rounded" />
                      <div className="w-16 h-2 bg-black/5 rounded" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="w-full h-4 bg-black/5 rounded" />
                    <div className="w-full h-4 bg-black/5 rounded" />
                    <div className="w-2/3 h-4 bg-black/5 rounded" />
                  </div>
                  <div className="pt-4 flex gap-4">
                    <div className="w-8 h-8 bg-black/5 rounded-full" />
                    <div className="w-8 h-8 bg-black/5 rounded-full" />
                    <div className="w-8 h-8 bg-black/5 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-black rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Dashboard / App View ---
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F8F9FB] text-[#141414] flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-black/5 flex flex-col sticky top-0 h-screen">
        <div className="p-8">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-black tracking-tighter">Threads Auto-Poster</span>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => setView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'dashboard' ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-black/60 hover:bg-black/5'}`}
            >
              <LayoutDashboard className="w-4 h-4" /> ダッシュボード
            </button>
            <button 
              onClick={() => setView('content')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'content' ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-black/60 hover:bg-black/5'}`}
            >
              <Sparkles className="w-4 h-4" /> コンテンツ生成
            </button>
            <button 
              onClick={() => setView('automation')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'automation' ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-black/60 hover:bg-black/5'}`}
            >
              <Zap className="w-4 h-4" /> 自動投稿設定
            </button>
            <button 
              onClick={() => setView('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'history' ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-black/60 hover:bg-black/5'}`}
            >
              <Clock className="w-4 h-4" /> 投稿履歴
            </button>
            <button 
              onClick={() => setView('character')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'character' ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-black/60 hover:bg-black/5'}`}
            >
              <UserIcon className="w-4 h-4" /> キャラクター設定
            </button>
            <button 
              onClick={() => setView('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'settings' ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-black/60 hover:bg-black/5'}`}
            >
              <SettingsIcon className="w-4 h-4" /> システム設定
            </button>
            <button 
              onClick={() => setShowTutorial(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-black/60 hover:bg-black/5"
            >
              <HelpCircle className="w-4 h-4" /> 使い方ガイド
            </button>
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-black/5">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-widest text-black/70">連携アカウント ({accounts.length}/3)</label>
                {accounts.length < 3 && (
                  <button onClick={() => setShowManualConnect(true)} className="p-1.5 hover:bg-black/5 rounded-full transition-colors">
                    <Plus className="w-4 h-4 text-black/60" />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {accounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-2 bg-black/5 rounded-lg group">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 bg-black text-white rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                        {acc.accountName.slice(0, 2)}
                      </div>
                      <span className="text-xs font-bold truncate text-black/80">{acc.accountName}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={async () => {
                          const newToken = window.prompt('新しいAccess Tokenを入力してください');
                          if (newToken && user) {
                            await firebaseService.updateAccount(user.uid, acc.id, { threadsToken: newToken });
                            setStatus({ type: 'success', message: 'トークンを更新しました' });
                            setTimeout(() => setStatus(null), 3000);
                          }
                        }}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                        title="トークンを更新"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (window.confirm('アカウントの連携を解除しますか？') && user) {
                            await firebaseService.deleteAccount(user.uid, acc.id);
                            setStatus({ type: 'success', message: '連携を解除しました' });
                            setTimeout(() => setStatus(null), 3000);
                          }
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="連携を解除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <button 
                    onClick={handleConnect}
                    className="w-full py-3 border border-dashed border-black/20 rounded-lg text-xs font-bold text-black/70 hover:border-black/40 transition-all"
                  >
                    アカウントを連携
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-black/5">
              <div className="flex items-center gap-3 mb-4">
                <img src={user?.photoURL || ""} className="w-8 h-8 rounded-full bg-black/5" />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate">{user?.displayName}</p>
                  <p className="text-[11px] text-black/70 truncate">{user?.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-3 h-3" /> ログアウト
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-12 max-w-5xl mx-auto w-full">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-2">
              {view === 'dashboard' && '運用状況ダッシュボード'}
              {view === 'content' && '投稿を作成'}
              {view === 'automation' && '自動投稿設定'}
              {view === 'character' && 'キャラクター設定'}
              {view === 'settings' && 'システム設定'}
            </h2>
            <p className="text-black/70 text-sm font-medium">
              {view === 'dashboard' && '現在の運用状況やログを確認します。'}
              {view === 'content' && 'AIと一緒に魅力的な投稿を考えましょう。'}
              {view === 'automation' && '指定した時間にAIが自動で投稿を行います。'}
              {view === 'character' && 'あなたの分身となるAIの性格を定義します（最大3体）。'}
              {view === 'settings' && 'APIキーや接続情報を管理します。'}
            </p>
          </div>
          
          <AnimatePresence>
            {status && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xl ${
                  status.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}
              >
                {status.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {status.message}
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* --- View: Dashboard --- */}
        {view === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex flex-col justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">本日の投稿</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">
                    {logs.filter(l => l.status === 'success' && l.timestamp && l.timestamp.toDate().toDateString() === new Date().toDateString()).length}
                  </span>
                  <span className="text-sm font-bold text-black/40">件</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex flex-col justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">累計投稿数</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">
                    {logs.filter(l => l.status === 'success').length}
                  </span>
                  <span className="text-sm font-bold text-black/40">件</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex flex-col justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">連携アカウント</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">{accounts.length}</span>
                  <span className="text-sm font-bold text-black/40">/ 3</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex flex-col justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">自動投稿設定</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">{schedules.filter(s => s.enabled).length}</span>
                  <span className="text-sm font-bold text-black/40">稼働中</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Latest Content */}
              <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-black/5">
                <h3 className="text-sm font-black mb-6">最新の投稿</h3>
                {logs.length > 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-black/5 rounded-2xl">
                      <p className="text-sm font-medium whitespace-pre-wrap">{logs[0].text}</p>
                      <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-black/40">
                        <span>{logs[0].timestamp ? logs[0].timestamp.toDate().toLocaleString('ja-JP') : '送信中...'}</span>
                        <span className={`px-2 py-1 rounded-full ${logs[0].status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {logs[0].status === 'success' ? '成功' : '失敗'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-black/40 text-sm font-bold">
                    まだ投稿がありません
                  </div>
                )}
              </div>

              {/* Recent Logs */}
              <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-black/5">
                <h3 className="text-sm font-black mb-6">運用ログ</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {logs.slice(0, 10).map(log => (
                    <div key={log.id} className="flex items-start gap-4 p-3 hover:bg-black/5 rounded-xl transition-colors">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-black/50 mb-1">
                          {log.timestamp ? log.timestamp.toDate().toLocaleString('ja-JP') : '送信中...'}
                          <span className="ml-2 px-1.5 py-0.5 bg-black/5 rounded text-[10px] uppercase tracking-wider">
                            {log.type === 'auto' ? '自動' : '手動'}
                          </span>
                        </p>
                        <p className="text-sm font-medium truncate">{log.text}</p>
                        {log.status === 'error' && (
                          <p className="text-xs text-red-500 mt-1 font-bold">{log.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-center py-10 text-black/40 text-sm font-bold">
                      ログがありません
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- View: Content Generation --- */}
        {view === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-black/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-black/50" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-black/70">AI Generator</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <select 
                      value={selectedCharId}
                      onChange={(e) => setSelectedCharId(e.target.value)}
                      className="flex-1 sm:flex-none text-xs font-bold bg-black/5 border-none rounded-lg px-3 py-2 min-w-[140px] focus:ring-2 focus:ring-black/10"
                    >
                      <option value="">キャラクターを選択</option>
                      {characters.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <select 
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="flex-1 sm:flex-none text-xs font-bold bg-black/5 border-none rounded-lg px-3 py-2 min-w-[140px] focus:ring-2 focus:ring-black/10"
                    >
                      <option value="">投稿先を選択</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.accountName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-black/80">トピック・指示</label>
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="例: 最近のAIニュースについて、自分のキャラっぽく解説して"
                      className="w-full h-32 p-5 bg-[#F8F9FB] rounded-2xl border-none focus:ring-2 focus:ring-black/5 resize-none text-sm leading-relaxed"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={generateContent}
                      disabled={isGenerating}
                      className="py-4 bg-black text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-80 disabled:opacity-30 transition-all"
                    >
                      {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      文章を生成
                    </button>
                    <button 
                      onClick={generateImage}
                      disabled={isGeneratingImage || !postText}
                      className="py-4 bg-white text-black border border-black/10 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-black/5 disabled:opacity-30 transition-all"
                    >
                      {isGeneratingImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
                      画像を生成
                    </button>
                  </div>
                </div>
              </div>

              {generatedImage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group"
                >
                  <img src={generatedImage} className="w-full aspect-video object-cover rounded-[2.5rem] shadow-xl" />
                  <button 
                    onClick={() => setGeneratedImage(null)}
                    className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-black/5 flex flex-col min-h-[500px]">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-4 h-4 text-black/50" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-black/70">Threads Preview</h3>
              </div>
              
              <textarea 
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="生成された文章がここに表示されます..."
                className="flex-1 w-full p-0 bg-transparent border-none focus:ring-0 resize-none text-xl font-medium leading-relaxed placeholder:text-black/10"
              />

              <div className="mt-8 pt-8 border-t border-black/5">
                <button 
                  onClick={submitPost}
                  disabled={isPosting || !postText || !selectedAccountId}
                  className="w-full py-5 bg-black text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 transition-all shadow-xl shadow-black/10"
                >
                  {isPosting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Threadsへ投稿
                </button>
                {!selectedAccountId && (
                  <p className="text-center text-xs font-bold text-red-500 mt-4 uppercase tracking-widest">
                    投稿先アカウントを選択してください
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- View: Automation --- */}
        {view === 'automation' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/70">スケジュール一覧</h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={addSchedule}
                  className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-80 transition-opacity flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" /> 新規スケジュール
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {schedules.length === 0 && (
                <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-black/10 text-center">
                  <p className="text-black/60 font-bold">スケジュールが設定されていません</p>
                </div>
              )}
              {schedules.map(s => {
                const isEditing = editingScheduleId === s.id;
                const data = isEditing ? tempSchedule : s;
                if (!data) return null;

                return (
                  <div key={s.id} className={`bg-white p-6 rounded-3xl border transition-all ${isEditing ? 'border-black shadow-xl' : 'border-black/5 shadow-sm'} flex flex-col gap-6`}>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div className="space-y-1">
                        <label className="text-[11px] font-black uppercase tracking-widest text-black/60">トリガー</label>
                        <div className="flex bg-black/5 rounded-lg p-1">
                          <button 
                            disabled={!isEditing}
                            onClick={() => updateTempSchedule('type', 'fixed')}
                            className={`flex-1 flex items-center justify-center p-1 rounded-md transition-all ${data.type === 'fixed' ? 'bg-white shadow-sm' : 'opacity-40'}`}
                          >
                            <Clock className="w-3 h-3" />
                          </button>
                          <button 
                            disabled={!isEditing}
                            onClick={() => updateTempSchedule('type', 'random')}
                            className={`flex-1 flex items-center justify-center p-1 rounded-md transition-all ${data.type === 'random' ? 'bg-white shadow-sm' : 'opacity-40'}`}
                          >
                            <Shuffle className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-black uppercase tracking-widest text-black/60">
                          {data.type === 'fixed' ? '投稿時間' : '1日の投稿回数'}
                        </label>
                        {data.type === 'fixed' ? (
                          <input 
                            type="time"
                            disabled={!isEditing}
                            value={data.time}
                            onChange={(e) => updateTempSchedule('time', e.target.value)}
                            className="w-full bg-black/5 border-none rounded-lg text-sm font-bold p-2 disabled:opacity-60"
                          />
                        ) : (
                          <input 
                            type="number"
                            disabled={!isEditing}
                            min="1"
                            max="24"
                            value={data.frequency}
                            onChange={(e) => updateTempSchedule('frequency', parseInt(e.target.value))}
                            className="w-full bg-black/5 border-none rounded-lg text-sm font-bold p-2 disabled:opacity-60"
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-black uppercase tracking-widest text-black/60">使用キャラ / アカウント</label>
                        <div className="space-y-1">
                          <select 
                            disabled={!isEditing}
                            value={data.characterId}
                            onChange={(e) => updateTempSchedule('characterId', e.target.value)}
                            className="w-full bg-black/5 border-none rounded-lg text-[10px] font-bold p-1 disabled:opacity-60"
                          >
                            {characters.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <select 
                            disabled={!isEditing}
                            value={data.accountId}
                            onChange={(e) => updateTempSchedule('accountId', e.target.value)}
                            className="w-full bg-black/5 border-none rounded-lg text-[10px] font-bold p-1 disabled:opacity-60"
                          >
                            {accounts.map(a => (
                              <option key={a.id} value={a.id}>{a.accountName}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-black/60">投稿トピック (任意)</label>
                        {isEditing ? (
                          <textarea 
                            value={data.prompt}
                            onChange={(e) => updateTempSchedule('prompt', e.target.value)}
                            placeholder="例: 最新のテックニュースについて、自分の意見を交えて話して"
                            className="w-full bg-black/5 border-none rounded-xl text-xs font-bold p-3 h-20 resize-none focus:ring-2 focus:ring-black/5"
                          />
                        ) : (
                          <div className="w-full bg-black/5 rounded-xl p-3 h-20 overflow-y-auto text-xs font-bold text-black/60">
                            {data.prompt || '日常のつぶやき'}
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-black/60">投稿する曜日</label>
                        <div className="flex gap-2">
                          {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => {
                            const isSelected = data.days?.includes(day);
                            return (
                              <button
                                key={day}
                                onClick={() => {
                                  const currentDays = data.days || [];
                                  const newDays = isSelected 
                                    ? currentDays.filter(d => d !== day)
                                    : [...currentDays, day];
                                  updateTempSchedule('days', newDays);
                                }}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${isSelected ? 'bg-black text-white' : 'bg-black/5 text-black/40'}`}
                              >
                                {day.toUpperCase()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-black/5">
                      <div className="flex items-center gap-4">
                        <button 
                          disabled={!isEditing}
                          onClick={() => updateTempSchedule('enabled', !data.enabled)}
                          className={`w-12 h-6 rounded-full transition-all relative ${data.enabled ? 'bg-green-500' : 'bg-black/10'} disabled:opacity-60`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${data.enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                          {data.enabled ? '有効' : '無効'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button 
                              onClick={cancelEditingSchedule}
                              className="px-4 py-2 text-black/40 hover:bg-black/5 rounded-xl transition-colors text-[10px] font-bold"
                            >
                              キャンセル
                            </button>
                            <button 
                              onClick={() => saveSchedule(s.id)}
                              disabled={isSavingSchedule === s.id}
                              className="px-6 py-2 bg-black text-white rounded-xl text-[10px] font-bold hover:opacity-80 transition-opacity flex items-center gap-2 disabled:opacity-50"
                            >
                              {isSavingSchedule === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              保存
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => removeSchedule(s.id)}
                              className={`p-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold ${showDeleteConfirm === s.id ? 'bg-red-500 text-white' : 'text-red-500 hover:bg-red-50'}`}
                            >
                              <Trash2 className="w-4 h-4" />
                              {showDeleteConfirm === s.id ? '本当に削除？' : '削除'}
                            </button>
                            <button 
                              onClick={() => startEditingSchedule(s)}
                              className="px-4 py-2 bg-black/5 text-black rounded-xl text-[10px] font-bold hover:bg-black/10 transition-colors flex items-center gap-2"
                            >
                              <SettingsIcon className="w-3 h-3" />
                              編集
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-start gap-4">
              <Sparkles className="w-5 h-5 text-blue-600 mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-blue-900">自動投稿の仕組み</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  <span className="font-black">固定時間:</span> 指定した時間に毎日投稿します。<br />
                  <span className="font-black">ランダム:</span> 1日の投稿回数を指定すると、AIが最適なタイミングを判断してランダムに投稿します。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --- View: Character Settings --- */}
        {view === 'character' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div className="flex gap-4 overflow-x-auto pb-2 flex-1 mr-4">
                {characters.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => {
                      setSelectedCharId(c.id);
                      setIsEditingChar(false);
                    }}
                    className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${selectedCharId === c.id ? 'bg-black text-white shadow-lg' : 'bg-white text-black/40 border border-black/5'}`}
                  >
                    {c.name}
                  </button>
                ))}
                {characters.length === 0 && (
                  <p className="text-sm font-bold text-black/20 py-3">キャラクターが未設定です</p>
                )}
              </div>
              {characters.length < 3 && (
                <button 
                  onClick={addCharacter}
                  className="bg-black text-white p-3 rounded-2xl hover:opacity-80 transition-all flex-shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="max-w-2xl space-y-8">
              {characters.length === 0 ? (
                <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-black/10 text-center space-y-6">
                  <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto">
                    <UserIcon className="w-8 h-8 text-black/20" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-black text-xl">キャラクターを作成しましょう</h4>
                    <p className="text-sm text-black/40">あなたの分身となるAIの性格を設定してください。</p>
                  </div>
                  <button 
                    onClick={addCharacter}
                    className="bg-black text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform"
                  >
                    最初のキャラクターを作成
                  </button>
                </div>
              ) : tempChar ? (
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-black/5 space-y-8 relative">
                  <button 
                    onClick={() => setShowDeleteConfirm(tempChar.id)}
                    className="absolute top-8 right-8 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {showDeleteConfirm === tempChar.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center space-y-6"
                      >
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                          <Trash2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xl font-black">キャラクターを削除しますか？</h4>
                          <p className="text-sm text-black/40">この操作は取り消せません。</p>
                        </div>
                        <div className="flex gap-4 w-full max-w-xs">
                          <button 
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex-1 py-4 bg-black/5 text-black rounded-2xl font-bold hover:bg-black/10 transition-all"
                          >
                            キャンセル
                          </button>
                          <button 
                            onClick={() => {
                              deleteCharacter(tempChar.id);
                              setShowDeleteConfirm(null);
                            }}
                            className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                          >
                            削除する
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isEditingChar ? (
                    <div className="space-y-8">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-black text-white rounded-[2rem] flex items-center justify-center text-3xl font-black">
                          {tempChar.name.slice(0, 1)}
                        </div>
                        <div>
                          <h3 className="text-2xl font-black">{tempChar.name}</h3>
                          <p className="text-sm text-black/40 font-bold uppercase tracking-widest">一人称: {tempChar.firstPerson}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        <div className="p-6 bg-black/5 rounded-3xl space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-black/30">基本設定</p>
                          <p className="text-sm leading-relaxed">{tempChar.basicInfo}</p>
                        </div>
                        <div className="p-6 bg-black/5 rounded-3xl space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-black/30">語尾・口調</p>
                          <p className="text-sm leading-relaxed">{tempChar.ending}</p>
                        </div>
                        <div className="p-6 bg-black/5 rounded-3xl space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-black/30">投稿スタイル</p>
                          <p className="text-sm leading-relaxed">{tempChar.tendency}</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => setIsEditingChar(true)}
                        className="w-full py-5 bg-black text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:opacity-80 transition-all shadow-xl shadow-black/10"
                      >
                        <RefreshCw className="w-5 h-5" /> 設定を編集する
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-black/40">キャラクター名</label>
                          <input 
                            type="text"
                            value={tempChar.name}
                            onChange={(e) => setTempChar({ ...tempChar, name: e.target.value })}
                            placeholder="例: テックおじさん"
                            className="w-full p-5 bg-[#F8F9FB] rounded-2xl border-none focus:ring-2 focus:ring-black/5 text-sm font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-black/40">基本設定・プロフィール</label>
                          <textarea 
                            value={tempChar.basicInfo}
                            onChange={(e) => setTempChar({ ...tempChar, basicInfo: e.target.value })}
                            placeholder="例: 20代のカフェ巡りが好きな女性。明るくポジティブ。"
                            className="w-full h-24 p-5 bg-[#F8F9FB] rounded-2xl border-none focus:ring-2 focus:ring-black/5 resize-none text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-black/40">一人称</label>
                            <input 
                              type="text"
                              value={tempChar.firstPerson}
                              onChange={(e) => setTempChar({ ...tempChar, firstPerson: e.target.value })}
                              placeholder="例: 私、僕、自分"
                              className="w-full p-5 bg-[#F8F9FB] rounded-2xl border-none focus:ring-2 focus:ring-black/5 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-black/40">語尾・口調</label>
                            <input 
                              type="text"
                              value={tempChar.ending}
                              onChange={(e) => setTempChar({ ...tempChar, ending: e.target.value })}
                              placeholder="例: 〜だよ！、〜です。"
                              className="w-full p-5 bg-[#F8F9FB] rounded-2xl border-none focus:ring-2 focus:ring-black/5 text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-black/40">投稿の傾向・スタイル</label>
                          <textarea 
                            value={tempChar.tendency}
                            onChange={(e) => setTempChar({ ...tempChar, tendency: e.target.value })}
                            placeholder="例: 週末のお出かけ情報や、美味しいスイーツのレビューが中心。"
                            className="w-full h-32 p-5 bg-[#F8F9FB] rounded-2xl border-none focus:ring-2 focus:ring-black/5 resize-none text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setIsEditingChar(false)}
                          className="flex-1 py-5 bg-black/5 text-black rounded-2xl font-black hover:bg-black/10 transition-all"
                        >
                          キャンセル
                        </button>
                        <button 
                          onClick={updateCharacter}
                          className="flex-[2] py-5 bg-black text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:opacity-80 transition-all shadow-xl shadow-black/10"
                        >
                          <Save className="w-5 h-5" /> 設定を保存する
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-12 rounded-[2.5rem] border border-black/5 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-black/10 mx-auto mb-4" />
                  <p className="text-black/30 font-bold">キャラクター情報を読み込み中...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- View: Post History --- */}
        {view === 'history' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-black/40">投稿履歴</h3>
                <p className="text-xs text-black/40 mt-1">過去の投稿結果を確認できます。</p>
              </div>
              {logs.length > 0 && (
                <div className="relative">
                  <button 
                    onClick={() => setShowHistoryDeleteConfirm(!showHistoryDeleteConfirm)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all border border-red-100"
                  >
                    <Trash2 className="w-3 h-3" /> 履歴をクリア
                  </button>
                  
                  <AnimatePresence>
                    {showHistoryDeleteConfirm && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white p-4 rounded-2xl shadow-xl border border-black/5 z-50 space-y-3"
                      >
                        <p className="text-[10px] font-bold text-black/60 text-center">本当に削除しますか？</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowHistoryDeleteConfirm(false)}
                            className="flex-1 py-2 bg-black/5 text-black rounded-lg text-[10px] font-bold"
                          >
                            いいえ
                          </button>
                          <button 
                            onClick={clearHistory}
                            className="flex-1 py-2 bg-red-500 text-white rounded-lg text-[10px] font-bold"
                          >
                            はい
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {logs.map(log => (
                <div key={log.id} className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm hover:shadow-md transition-all flex items-start gap-6 group">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${log.status === 'success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                    {log.status === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${log.type === 'manual' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {log.type === 'manual' ? '手動' : '自動'}
                        </span>
                        <span className="text-xs font-bold text-black/30">
                          {log.timestamp?.toDate().toLocaleString() || '記録中...'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3 h-3 text-black/20" />
                        <span className="text-xs font-bold text-black/40">
                          {characters.find(c => c.id === log.characterId)?.name || '不明なキャラ'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-[#F8F9FB] p-4 rounded-2xl">
                      <p className="text-sm font-medium text-black/80 leading-relaxed whitespace-pre-wrap">
                        {log.text || <span className="italic opacity-40">本文なし</span>}
                      </p>
                    </div>

                    {log.status === 'error' && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600 font-bold leading-relaxed">{log.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="bg-white p-16 rounded-[3rem] border border-dashed border-black/10 text-center space-y-4">
                  <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-black/10" />
                  </div>
                  <p className="text-black/30 font-bold">履歴はまだありません</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- View: System Settings --- */}
        {view === 'settings' && (
          <div className="max-w-2xl space-y-8 pb-20">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-black/5 space-y-8">
              <div className="space-y-6">
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                  <Key className="w-5 h-5 text-amber-600 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-amber-900">AI APIキーの設定</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      文章生成にはGoogle GeminiのAPIキーが必要です。
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline ml-1">こちらから取得</a>できます。
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-black/40">タイムゾーン</label>
                  <select 
                    value={userTimezone}
                    onChange={(e) => setUserTimezone(e.target.value)}
                    className="w-full p-5 bg-[#F8F9FB] rounded-2xl border-none focus:ring-2 focus:ring-black/5 text-sm font-bold"
                  >
                    <option value="UTC">UTC (世界標準時)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (日本標準時)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (太平洋標準時)</option>
                    <option value="America/New_York">America/New_York (東部標準時)</option>
                    <option value="Europe/London">Europe/London (ロンドン)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-black/40">Gemini API Key</label>
                  <input 
                    type="password"
                    value={userGeminiKey}
                    onChange={(e) => setUserGeminiKey(e.target.value)}
                    placeholder="AI Studioで取得したキーを入力"
                    className="w-full p-5 bg-[#F8F9FB] rounded-2xl border-none focus:ring-2 focus:ring-black/5 text-sm font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-black/40">ThreadsアプリID</label>
                    <input 
                      type="text"
                      value={draftThreadsClientId}
                      onChange={(e) => setDraftThreadsClientId(e.target.value)}
                      placeholder="1446..."
                      className="w-full p-5 bg-[#F8F9FB] rounded-2xl border-none focus:ring-2 focus:ring-black/5 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-black/40">Threads app secret</label>
                    <input 
                      type="password"
                      value={draftThreadsClientSecret}
                      onChange={(e) => setDraftThreadsClientSecret(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-5 bg-[#F8F9FB] rounded-2xl border-none focus:ring-2 focus:ring-black/5 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                  <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Metaに登録するリダイレクトURI</p>
                  <div className="flex items-center justify-between gap-4">
                    <code className="text-[10px] font-mono text-blue-700 break-all">{window.location.origin}/auth/callback</code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/auth/callback`);
                        setStatus({ type: 'success', message: 'コピーしました' });
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold shrink-0"
                    >
                      コピー
                    </button>
                  </div>
                  <p className="text-[9px] text-blue-600/70 leading-tight">
                    ※Metaの「Threads設定」→「リダイレクトURI」にこのURLを登録してください。
                  </p>
                </div>
              </div>

              <div className="space-y-6 pt-8 border-t border-black/5">
                <div className="flex items-center gap-4">
                  <SettingsIcon className="w-5 h-5 text-blue-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-blue-900">Threads API 設定</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Threads APIは開発者によって設定されています。
                      アカウントを連携するだけで、自動投稿を開始できます。
                    </p>
                  </div>
                </div>
              </div>

              <motion.button 
                whileTap={{ scale: 0.98 }}
                onClick={saveSystemConfig}
                disabled={isSavingConfig}
                className="w-full py-5 bg-black text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:opacity-80 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
              >
                {isSavingConfig ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSavingConfig ? "保存中..." : "設定を保存する"}
              </motion.button>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-black/5 space-y-6">
              <div className="p-8 bg-blue-50 rounded-[3rem] border border-blue-100 space-y-4">
                <h3 className="text-lg font-black text-blue-900 flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  認証コードから連携を完了する
                </h3>
                
                <div className="space-y-3">
                  <p className="text-xs font-bold text-blue-700/70 leading-relaxed">
                    1. まずはMetaの認証画面で許可を出してください。
                  </p>
                  <button 
                    onClick={handleConnect}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    <ExternalLink className="w-4 h-4" /> Metaで認証を開始する
                  </button>
                </div>

                <div className="space-y-3 pt-4 border-t border-blue-100">
                  <p className="text-xs font-bold text-blue-700/70 leading-relaxed">
                    2. 認証後のURL（code=...が含まれるもの）をここに貼り付けてください。
                  </p>
                  <div className="flex gap-3">
                    <input 
                      type="text"
                      value={authCodeUrl}
                      onChange={(e) => setAuthCodeUrl(e.target.value)}
                      placeholder="https://...code=AQB..."
                      className="flex-1 p-5 rounded-2xl border-2 border-blue-200 focus:border-blue-500 outline-none font-mono text-xs bg-white shadow-inner"
                    />
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={exchangeCode}
                      disabled={isExchanging || !authCodeUrl}
                      className="px-8 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                      {isExchanging && <RefreshCw className="w-4 h-4 animate-spin" />}
                      {isExchanging ? "処理中..." : "連携を完了"}
                    </motion.button>
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-black uppercase tracking-widest text-black/40 mb-6">Threads API Status</h3>
              <div className="space-y-4">
                {accounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-6 bg-[#F8F9FB] rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <div className="space-y-1">
                        <span className="text-sm font-bold block">{acc.accountName}</span>
                        <span className="text-[10px] text-black/40 block">ID: {acc.threadsUserId}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          setTokenUpdateAccId(acc.id);
                          setNewTokenValue("");
                        }}
                        className="text-xs font-bold text-blue-500 hover:underline"
                      >
                        トークン更新
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmAccId(acc.id)}
                        className="text-xs font-bold text-red-500 hover:underline"
                      >
                        解除
                      </button>
                    </div>
                  </div>
                ))}
                {accounts.length < 3 && (
                  <button 
                    onClick={handleConnect}
                    className="w-full p-6 border border-dashed border-black/10 rounded-2xl text-sm font-bold text-black/30 hover:border-black/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> 新しいアカウントを連携
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      {/* Payment Gate (Temporarily disabled for testing) */}
      {/* !isPaid && !isTrialActive && user && view !== 'landing' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          ...
        </div>
      ) */}
      <AnimatePresence>
        {showManualConnect && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManualConnect(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black">Threads連携</h3>
                <p className="text-sm text-black/70">アカウント情報を手動で入力して連携します。</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-black/60">アカウント名</label>
                  <input 
                    type="text"
                    value={manualAccount.accountName}
                    onChange={(e) => setManualAccount({ ...manualAccount, accountName: e.target.value })}
                    placeholder="例: @my_threads_account"
                    className="w-full p-4 bg-black/5 rounded-2xl border-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-black/60">Threads User ID</label>
                  <input 
                    type="text"
                    value={manualAccount.threadsUserId}
                    onChange={(e) => setManualAccount({ ...manualAccount, threadsUserId: e.target.value })}
                    placeholder="数値のIDを入力"
                    className="w-full p-4 bg-black/5 rounded-2xl border-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-black/60">Access Token</label>
                  <input 
                    type="password"
                    value={manualAccount.threadsToken}
                    onChange={(e) => setManualAccount({ ...manualAccount, threadsToken: e.target.value })}
                    placeholder="アクセストークンを入力"
                    className="w-full p-4 bg-black/5 rounded-2xl border-none text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowManualConnect(false)}
                  className="flex-1 py-4 bg-black/5 text-black rounded-2xl font-bold hover:bg-black/10 transition-all"
                >
                  キャンセル
                </button>
                <button 
                  onClick={async () => {
                    await linkThreadsAccount(manualAccount);
                    setShowManualConnect(false);
                    setManualAccount({ threadsToken: '', threadsUserId: '', accountName: '' });
                  }}
                  className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold hover:opacity-80 transition-all shadow-lg shadow-black/10"
                >
                  連携する
                </button>
              </div>

              <div className="pt-4 border-t border-black/5">
                <button 
                  onClick={() => {
                    setShowManualConnect(false);
                    // Open manual input modal instead of looping
                    // Actually, handleConnect now opens OAuth. 
                    // Let's keep this as a fallback to OAuth.
                    handleConnect();
                  }}
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold text-black/70 hover:text-black transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> OAuthで連携する（推奨）
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {tokenUpdateAccId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTokenUpdateAccId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black">トークン更新</h3>
                <p className="text-sm text-black/70">新しいAccess Tokenを入力してください。</p>
              </div>
              <input 
                type="password" 
                value={newTokenValue} 
                onChange={e => setNewTokenValue(e.target.value)} 
                placeholder="新しいAccess Token"
                className="w-full bg-black/5 border-none rounded-xl p-4 text-sm font-mono"
              />
              <div className="flex gap-4">
                <button onClick={() => setTokenUpdateAccId(null)} className="flex-1 p-4 rounded-xl font-bold bg-black/5 hover:bg-black/10 transition-colors">キャンセル</button>
                <button 
                  onClick={async () => {
                    if (!user || !tokenUpdateAccId) return;
                    try {
                      await firebaseService.updateAccount(user.uid, tokenUpdateAccId, { 
                        threadsToken: newTokenValue,
                        lastRefreshedAt: serverTimestamp() as any
                      });
                      setStatus({ type: 'success', message: 'トークンを更新しました' });
                    } catch (err) {
                      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/accounts/${tokenUpdateAccId}`);
                    }
                    setTokenUpdateAccId(null);
                    setNewTokenValue("");
                  }}
                  className="flex-1 p-4 rounded-xl font-bold bg-black text-white hover:opacity-80 transition-opacity"
                >
                  更新
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deleteConfirmAccId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmAccId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-8 text-center"
            >
              <h3 className="text-2xl font-black text-red-500">連携解除</h3>
              <p className="font-bold">このアカウントの連携を解除しますか？</p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteConfirmAccId(null)} className="flex-1 p-4 rounded-xl font-bold bg-black/5 hover:bg-black/10 transition-colors">キャンセル</button>
                <button 
                  onClick={async () => {
                    if (!user || !deleteConfirmAccId) return;
                    try {
                      await firebaseService.deleteAccount(user.uid, deleteConfirmAccId);
                      setStatus({ type: 'success', message: '連携を解除しました' });
                    } catch (err) {
                      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/accounts/${deleteConfirmAccId}`);
                    }
                    setDeleteConfirmAccId(null);
                  }}
                  className="flex-1 p-4 rounded-xl font-bold bg-red-500 text-white hover:opacity-80 transition-opacity"
                >
                  解除する
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* Threads API Setup Tutorial Modal */}
        {showTutorial && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-black/5 flex items-center justify-between bg-blue-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-blue-900">Threads API 設定ガイド</h2>
                    <p className="text-xs font-bold text-blue-600/80 uppercase tracking-widest">Meta Developer Setup Guide</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTutorial(false)}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-black">1</span>
                    <h3 className="font-black text-lg">Meta for Developersに登録</h3>
                  </div>
                  <div className="pl-11 space-y-3">
                    <p className="text-sm text-black/60 leading-relaxed">
                      <a href="https://developers.facebook.com/" target="_blank" className="text-blue-600 font-bold underline">Meta for Developers</a> 
                      にアクセスし、開発者アカウントを作成してください。
                    </p>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-black">2</span>
                    <h3 className="font-black text-lg">新しいアプリを作成</h3>
                  </div>
                  <div className="pl-11 space-y-3">
                    <p className="text-sm text-black/60 leading-relaxed">
                      「マイアプリ」から「アプリを作成」をクリックし、以下の設定で作成します：
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm font-bold bg-black/5 p-3 rounded-xl">
                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                        ユースケース: 「Threads API」を選択
                      </li>
                    </ul>
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-sm font-bold text-blue-900 mb-2">※ユースケースにThreads APIがない場合</p>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        アプリ作成後、左側メニューの「ダッシュボード」を開き、画面下部の「製品を追加」セクションから「Threads API」を見つけて「設定」をクリックしてください。
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-black">3</span>
                    <h3 className="font-black text-lg">Threads設定の構成</h3>
                  </div>
                  <div className="pl-11 space-y-4">
                    <p className="text-sm text-black/60 leading-relaxed">
                      アプリ設定の「Threads」セクションで、以下のリダイレクトURIを追加してください：
                    </p>
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 font-mono text-xs break-all select-all cursor-pointer group relative">
                      {window.location.origin}/auth/callback
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded">コピー</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-black">4</span>
                    <h3 className="font-black text-lg">APIキーの取得と入力</h3>
                  </div>
                  <div className="pl-11 space-y-3">
                    <p className="text-sm text-black/60 leading-relaxed">
                      「アプリの設定」→「ベーシック」から以下の情報をコピーし、本ツールの設定画面に入力してください：
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-black/5 rounded-2xl text-center">
                    <p className="text-[11px] font-black uppercase text-black/70 mb-1">App ID</p>
                        <p className="text-xs font-bold">Client ID</p>
                      </div>
                      <div className="p-4 bg-black/5 rounded-2xl text-center">
                    <p className="text-[11px] font-black uppercase text-black/70 mb-1">App Secret</p>
                        <p className="text-xs font-bold">Client Secret</p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-start gap-4">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-amber-900">注意点</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Metaのアプリが「開発モード」の場合、テスターとして登録したアカウントのみ連携可能です。
                      一般公開するには、Metaによるアプリレビューが必要です。
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-black/5 bg-gray-50">
                <button 
                  onClick={() => setShowTutorial(false)}
                  className="w-full py-5 bg-black text-white rounded-2xl font-black shadow-xl shadow-black/10 hover:opacity-80 transition-all"
                >
                  理解しました
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
