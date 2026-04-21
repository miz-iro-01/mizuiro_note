'use client';

import Header from '@/components/layout/header'
import Sidebar from '@/components/layout/sidebar'
import { useUser, useFirestore, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase'
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Stripe Elements
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

const ADMIN_EMAILS = ['oumaumauma32@gmail.com', 'sl0wmugi9@gmail.com'];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(firestore, 'users', user.uid) : null
  }, [firestore, user])
  
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef)

  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [stripePromise, setStripePromise] = useState<any>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }

    if (!isUserLoading && user && firestore) {
      const uidRef = doc(firestore, 'users', user.uid);
      getDoc(uidRef).then(async (docSnap) => {
        let isInvited = false;
        let isForcedAdmin = false;
        
        if (user.email && ADMIN_EMAILS.includes(user.email)) {
           isInvited = true;
           isForcedAdmin = true;
        }

        if (!docSnap.exists() || !docSnap.data()?.subscriptionStatus) {
          if (!isInvited && user.email) {
            const inviteSnapshot = await getDoc(doc(firestore, 'system', 'invitations'));
            if (inviteSnapshot.exists()) {
              const emails = inviteSnapshot.data()?.emails || [];
              if (emails.includes(user.email)) {
                isInvited = true;
              }
            }
          }

          setDoc(uidRef, {
            id: user.uid,
            email: user.email,
            createdAt: docSnap.data()?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
            subscriptionStatus: isInvited ? 'active' : 'incomplete',
            plan: isInvited ? 'pro' : null,
          }, { merge: true });
        } else if (isForcedAdmin && docSnap.data()?.plan !== 'pro') {
          // 管理者なのにDB上でproになっていない場合、強制的に更新する
          setDoc(uidRef, {
            subscriptionStatus: 'active',
            plan: 'pro'
          }, { merge: true });
        }
      });
    }
  }, [isUserLoading, user, firestore, router]);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
  const hasAccess = isAdmin || userData?.subscriptionStatus === 'active' || userData?.subscriptionStatus === 'trialing' || userData?.subscriptionStatus === 'canceled'

  // fetchClientSecret callback (Embedded Checkout requires this pattern)
  const fetchClientSecret = useCallback(async () => {
    if (!user) return '';
    try {
      setCheckoutLoading(true);
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, email: user.email })
      });
      const data = await response.json();
      
      if (data.publishableKey) {
        setStripePromise(loadStripe(data.publishableKey));
      }
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        return data.clientSecret;
      } else {
        setHasError(true);
        return '';
      }
    } catch (e) {
      console.error(e);
      setHasError(true);
      return '';
    } finally {
      setCheckoutLoading(false);
    }
  }, [user]);

  // If not access, trigger fetch
  useEffect(() => {
    if (userData && !hasAccess && !clientSecret && !checkoutLoading && !hasError) {
      fetchClientSecret();
    }
  }, [hasAccess, userData, clientSecret, fetchClientSecret, checkoutLoading, hasError]);

  if (isUserLoading || !user || isUserDataLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!hasAccess && userData) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 pb-24">
        <Card className="w-full max-w-4xl shadow-2xl border-primary/20 overflow-hidden">
          <CardHeader className="text-center pb-2 bg-primary text-primary-foreground">
            <div className="flex justify-center mb-4">
               <div className="h-16 w-16 rounded-full bg-background/20 flex items-center justify-center">
                 <Sparkles className="h-8 w-8 text-background" />
               </div>
            </div>
            <CardTitle className="text-4xl font-extrabold tracking-tight pb-2">
              7日間 無料トライアル開始
            </CardTitle>
            <CardDescription className="text-sm pt-2 text-primary-foreground/90 font-medium">
              今すぐ登録して、MIZUIROの全機能（スタンダード）を7日間お試しいただけます。
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 bg-card text-card-foreground flex flex-col md:flex-row gap-6">
             {/* Left Column: UI/Benefits */}
             <div className="w-full md:w-1/3 p-6 sm:p-0 md:pr-6 md:border-r border-border space-y-6 flex flex-col justify-center">
               <div className="space-y-3">
                 <ul className="text-sm space-y-4 font-medium text-muted-foreground">
                   <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500"/> <span>楽天アフィリエイト連携</span></li>
                   <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500"/> <span>AIブログ記事自動生成</span></li>
                   <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500"/> <span>Threads同時投稿</span></li>
                   <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500"/> <span>Pinterest画像生成</span></li>
                 </ul>
               </div>

                <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg mt-8">
                  <p className="font-bold text-foreground mb-1">【プランの自動移行について】</p>
                  ※ クレジットカード登録後、最初の7日間は完全無料です。8日目より自動で「スタンダードプラン（月額3,980円）」へ移行し、課金が発生します。<br/>
                  ※ トライアル期間中にキャンセルされた場合、料金は一切発生いたしません。
               </div>
             </div>
             
             {/* Right Column: Stripe Embedded Checkout */}
             <div className="w-full md:w-2/3 min-h-[400px] flex items-center justify-center bg-card">
                {hasError && (
                  <div className="text-center text-red-500 p-8 border border-red-200 rounded-lg bg-red-50">
                    <p className="font-bold">決済システムの読み込みに失敗しました。</p>
                    <p className="text-sm mt-2">システム管理者（Stripe設定）で公開APIキーなどが正しく登録されているか確認してください。</p>
                  </div>
                )}
                
                {checkoutLoading && !clientSecret && !hasError && (
                  <div className="flex flex-col items-center justify-center space-y-4">
                     <Loader2 className="h-8 w-8 animate-spin text-primary" />
                     <p className="text-sm text-muted-foreground">安全な決済画面を準備中...</p>
                  </div>
                )}

                {clientSecret && stripePromise && (
                  <div id="checkout" className="w-full">
                    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dashboard Normal View
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col md:pl-64">
        <Header />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
