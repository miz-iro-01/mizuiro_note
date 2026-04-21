'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { doc } from 'firebase/firestore'
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, useAuth, initiateGoogleSignIn } from '@/firebase'
import { Loader2, AlertCircle, Globe, PenSquare, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const integrationsFormSchema = z.object({
  rakutenAffiliateId: z.string().optional(),
  amazonAccessKey: z.string().optional(),
  amazonSecretKey: z.string().optional(),
  amazonAssociateTag: z.string().optional(),
  googleApiKey: z.string().optional(),
  averageRakutenUnitValue: z.coerce
    .number()
    .positive('0より大きい値を入力してください。')
    .optional(),
  wordpressUrl: z.string().url('有効なURLを入力してください。').optional().or(z.literal('')),
  wordpressUsername: z.string().optional(),
  wordpressAppPassword: z.string().optional(),
  hatenaId: z.string().optional(),
  hatenaBlogId: z.string().optional(),
  hatenaApiKey: z.string().optional(),
  hatenaEmail: z.string().email('有効なメールアドレスを入力してください。').optional().or(z.literal('')),
  threadsUserId: z.string().optional(),
  threadsAccessToken: z.string().optional(),
  pinterestBoardId: z.string().optional(),
  pinterestAccessToken: z.string().optional(),
  bloggerEmail: z.string().email('有効なメールアドレスを入力してください。').optional().or(z.literal('')),
  pinterestClientId: z.string().optional(),
})

export default function IntegrationsForm() {
  const { toast } = useToast()
  const { user } = useUser()
  const firestore = useFirestore()
  const auth = useAuth()
  const [activeSlot, setActiveSlot] = useState(1);
  
  // 共通の設定（APIキーなど）
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(firestore, 'users', user.uid)
  }, [firestore, user])
  const { data: userData } = useDoc(userDocRef)

  // スロット別の連携プロファイル
  const studioProfileRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(firestore, 'users', user.uid, 'studioProfiles', activeSlot.toString())
  }, [firestore, user, activeSlot])
  const { data: profileData, isLoading: isProfileLoading } = useDoc(studioProfileRef)

  const [showManualThreads, setShowManualThreads] = useState(false);
  
  const form = useForm<z.infer<typeof integrationsFormSchema>>({
    resolver: zodResolver(integrationsFormSchema),
    defaultValues: {
      rakutenAffiliateId: '',
      amazonAccessKey: '',
      amazonSecretKey: '',
      amazonAssociateTag: '',
      googleApiKey: '',
      averageRakutenUnitValue: 0,
      wordpressUrl: '',
      wordpressUsername: '',
      wordpressAppPassword: '',
      hatenaId: '',
      hatenaBlogId: '',
      hatenaApiKey: '',
      hatenaEmail: '',
      threadsUserId: '',
      threadsAccessToken: '',
      pinterestBoardId: '',
      pinterestAccessToken: '',
      pinterestClientId: '',
      bloggerEmail: '',
    },
  })

  useEffect(() => {
    // profileDataがあればそれを優先、なければuserData（既存設定）から取得してフォールバック
    const current = profileData || userData;
    if (current) {
      form.reset({
        rakutenAffiliateId: current.rakutenAffiliateId || userData?.rakutenAffiliateId || '',
        amazonAccessKey: current.amazonAccessKey || userData?.amazonAccessKey || '',
        amazonSecretKey: current.amazonSecretKey || userData?.amazonSecretKey || '',
        amazonAssociateTag: current.amazonAssociateTag || userData?.amazonAssociateTag || '',
        googleApiKey: userData?.googleApiKey || '', // APIキーは共通
        averageRakutenUnitValue: userData?.averageRakutenUnitValue || 0, // 単価も共通
        wordpressUrl: current.wordpressUrl || '',
        wordpressUsername: current.wordpressUsername || '',
        wordpressAppPassword: current.wordpressAppPassword || '',
        hatenaId: current.hatenaId || '',
        hatenaBlogId: current.hatenaBlogId || '',
        hatenaApiKey: current.hatenaApiKey || '',
        hatenaEmail: current.hatenaEmail || '',
        threadsUserId: current.threadsUserId || '',
        threadsAccessToken: current.threadsAccessToken || '',
        pinterestBoardId: current.pinterestBoardId || '',
        pinterestAccessToken: current.pinterestAccessToken || '',
        pinterestClientId: current.pinterestClientId || '',
        bloggerEmail: current.bloggerEmail || '',
      })
    }
  }, [profileData, userData, form, activeSlot])

  // OAuth Callback Handler (Hash fragment parsing)
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    
    const params = new URLSearchParams(hash.substring(1));
    
    // Blogger OAuth コールバック処理
    const bloggerToken = params.get('blogger_token');
    const bloggerRefresh = params.get('blogger_refresh');
    const bloggerSlotId = params.get('blogger_slot_id') || activeSlot.toString();
    
    if (bloggerToken) {
      const bloggerData: Record<string, any> = {
        accessToken: bloggerToken,
        isConnected: true,
        updatedAt: new Date().toISOString(),
        authMethod: 'authorization_code',
      };
      if (bloggerRefresh) {
        bloggerData.refreshToken = bloggerRefresh;
      }

      // スロット別プロファイルに保存
      const slotProfileRef = doc(firestore, `users/${user.uid}/studioProfiles/${bloggerSlotId}`);
      setDocumentNonBlocking(slotProfileRef, {
        integrations: { blogger: bloggerData },
        bloggerAccessToken: bloggerToken,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // ユーザー共通ドキュメントにも保存
      const userRef = doc(firestore, `users/${user.uid}`);
      setDocumentNonBlocking(userRef, {
        integrations: { blogger: bloggerData },
      }, { merge: true });

      toast({
        variant: 'success',
        title: 'Blogger連携が完了しました！🎉',
        description: bloggerRefresh 
          ? 'アクセストークンとリフレッシュトークンの両方を取得しました。自動更新が有効です。'
          : 'アクセストークンを取得しました。（リフレッシュトークンは取得できませんでした）',
        duration: 8000,
      });

      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return; // Bloggerの処理が終わったら早期リターン
    }

    // Pinterest / Threads の処理
    if (hash.includes('pinterest_token=') || hash.includes('threads_token=')) {
      const pinterestToken = params.get('pinterest_token');
      const threadsToken = params.get('threads_token');
      const threadsUserId = params.get('threads_user_id');

      const docRef = doc(firestore, `users/${user.uid}`);
      const updateData: Record<string, any> = {};

      if (pinterestToken) {
        updateData.pinterestAccessToken = pinterestToken;
        updateData['integrations.pinterest.isConnected'] = true;
        form.setValue('pinterestAccessToken', pinterestToken);
      }

      if (threadsToken && threadsUserId) {
        // OAuth戻りからslotIdを取得
        const oauthSlotId = params.get('threads_slot_id') || activeSlot.toString();
        const slotProfileRef = doc(firestore, `users/${user.uid}/studioProfiles/${oauthSlotId}`);
        
        const threadsUpdate = {
          threadsAccessToken: threadsToken,
          threadsUserId: threadsUserId,
          'integrations.threads.isConnected': true,
          updatedAt: new Date().toISOString()
        };
        
        setDocumentNonBlocking(slotProfileRef, threadsUpdate, { merge: true });
        
        if (oauthSlotId === activeSlot.toString()) {
          form.setValue('threadsAccessToken', threadsToken);
          form.setValue('threadsUserId', threadsUserId);
        }
      }
      
      if (Object.keys(updateData).length > 0) {
        // Pinterestなどは当面共通またはデフォルトスロット
        setDocumentNonBlocking(docRef, updateData, { merge: true });
        
        toast({
          title: '連携成功！🎉',
          description: '外部サービスとの連携が完了しました。',
        });

        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [user, firestore, toast, form, activeSlot]);

  function onSubmit(data: z.infer<typeof integrationsFormSchema>) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '認証されていません。ログインしてください。',
      })
      return
    }

    const slotRef = doc(firestore, `users/${user.uid}/studioProfiles/${activeSlot}`)
    
    // APIキーと楽天IDなどの共通設定を共通ドキュメントへ
    const commonData = {
      rakutenAffiliateId: data.rakutenAffiliateId?.trim() || '',
      amazonAccessKey: data.amazonAccessKey?.trim() || '',
      amazonSecretKey: data.amazonSecretKey?.trim() || '',
      amazonAssociateTag: data.amazonAssociateTag?.trim() || '',
      googleApiKey: data.googleApiKey?.trim() || '',
      averageRakutenUnitValue: data.averageRakutenUnitValue,
    }
    setDocumentNonBlocking(doc(firestore, `users/${user.uid}`), commonData, { merge: true })

    // それ以外（連携系）をスロット個別プロファイルへ
    const profileDataToSave = {
      wordpressUrl: data.wordpressUrl?.trim() || '',
      wordpressUsername: data.wordpressUsername?.trim() || '',
      wordpressAppPassword: data.wordpressAppPassword?.trim() || '',
      hatenaId: data.hatenaId?.trim() || '',
      hatenaBlogId: data.hatenaBlogId?.trim() || '',
      hatenaApiKey: data.hatenaApiKey?.trim() || '',
      hatenaEmail: data.hatenaEmail?.trim() || '',
      threadsUserId: data.threadsUserId?.trim() || '',
      threadsAccessToken: data.threadsAccessToken?.trim() || '',
      pinterestBoardId: data.pinterestBoardId?.trim() || '',
      pinterestAccessToken: data.pinterestAccessToken?.trim() || '',
      pinterestClientId: data.pinterestClientId?.trim() || '',
      bloggerEmail: data.bloggerEmail?.trim() || '',
      updatedAt: new Date().toISOString()
    }
    
    setDocumentNonBlocking(slotRef, profileDataToSave, { merge: true })

    toast({
      variant: 'success',
      title: `スタジオ ${activeSlot} の設定を保存しました 🎉`,
      description: '個別の連携情報がクラウドに保管されました。',
    })
  }

  if (isProfileLoading) {
    return (
       <div className="flex items-center justify-center p-8">
         <Loader2 className="h-6 w-6 animate-spin text-primary" />
         <p className="ml-3 text-muted-foreground">設定を読み込み中...</p>
       </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* スタジオ選択タブを追加 */}
        <div className="flex gap-2 p-1 bg-muted/30 rounded-lg w-fit mb-4">
          {[1, 2, 3].map((slot) => {
            const isLocked = slot > 1 && userData?.plan !== 'pro';
            return (
              <Button
                key={slot}
                type="button"
                variant={activeSlot === slot ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (isLocked) {
                    toast({ title: 'Proプラン限定機能です', description: 'スタジオ2・3を利用するにはProプランへのアップグレードが必要です。', variant: 'destructive' })
                    return;
                  }
                  setActiveSlot(slot)
                }}
                className={`px-6 h-8 text-xs font-bold ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                スタジオ {slot} 設定
                {slot > 1 && <span className="ml-1 text-[8px] bg-amber-100 text-amber-700 px-1 rounded leading-none">PRO</span>}
              </Button>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 楽天 API Block */}
          <Card className="bg-primary/5 border border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">楽天アフィリエイト設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="rakutenAffiliateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>楽天アフィリエイトID</FormLabel>
                    <FormControl>
                      <Input placeholder="楽天アフィリエイトから取得したID" {...field} />
                    </FormControl>
                    <FormDescription className="flex flex-col gap-1 pt-2">
                      <span>自動生成される商品リンクに埋め込む自分のIDです。</span>
                      <Link href="https://webservice.rakuten.co.jp/account_affiliate_id/" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        楽天アフィリエイトIDを確認する &rarr;
                      </Link>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="averageRakutenUnitValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>平均楽天単価（円）</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="例: 5000" {...field} />
                    </FormControl>
                    <FormDescription>
                      ダッシュボードの推定収益額の計算に使用されます。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Amazon API Block */}
          <Card className="bg-primary/5 border border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">Amazonアソシエイト設定</CardTitle>
              <CardDescription className="text-[10px] text-red-600 font-medium">
                PA APIへのアクセスをリクエストするには、以下を行う必要があります:<br/>
                ❌承認されたアソシエイトアカウントを持つ。<br/>
                ❌Amazonアソシエイトプログラム運営契約を遵守する。<br/>
                ❌過去30日間に条件を満たす売上を10件有する。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="amazonAccessKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PA-API アクセスキー</FormLabel>
                    <FormControl>
                      <Input placeholder="AKIA..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amazonSecretKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PA-API シークレットキー</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="シークレットキーを入力" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amazonAssociateTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>アソシエイト・タグ</FormLabel>
                    <FormControl>
                      <Input placeholder="yourid-22" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Google API Block */}
          <Card className="bg-primary/5 border border-primary/10 md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">Google AI API設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="googleApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google AI APIキー</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Google AI Studioから取得したAPIキー" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription className="flex flex-col gap-1 pt-2">
                      <span>AI機能（投稿生成、トレンド分析など）を利用するために必要です。</span>
                      <Link href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        Google AI StudioでAPIキーを取得する &rarr;
                      </Link>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting} size="lg" className="min-w-[200px] font-bold">
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            このスタジオの設定を保存
          </Button>
        </div>

        <div className="pt-8 border-t border-border/40">
          <h3 className="text-lg font-semibold mb-4">外部サービス連携</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-background/40 border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  Blogger
                </CardTitle>
                <CardDescription>
                  Googleのブログサービス「Blogger」に自動投稿します。「BloggerとOAuth連携する」ボタンを押し、ご自身のGoogleアカウントでログインして許可するだけで連携が完了します。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3">
                  {userData?.integrations?.blogger?.isConnected ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md border border-green-100">
                        <CheckCircle2 className="h-4 w-4" />
                        OAuth連携済み
                        {userData?.integrations?.blogger?.refreshToken ? (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-auto">自動更新: 有効</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-auto">自動更新: 無効（再連携推奨）</span>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full border-orange-500/20 text-orange-600 hover:bg-orange-50 font-bold"
                    onClick={() => {
                      // サーバーサイド認可コードフローでリフレッシュトークンを確実に取得
                      window.location.href = `/api/auth/google?userId=${user?.uid}&slotId=${activeSlot}`;
                    }}
                  >
                    {profileData?.integrations?.blogger?.isConnected ? '再連携してトークンを更新（推奨）' : 'BloggerとOAuth連携する（推奨）'}
                  </Button>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    ※ サーバー認可コードフローを使用し、リフレッシュトークンを確実に取得します。<br/>
                    環境変数（.env）に<code className="text-gray-500 bg-gray-100 px-1 rounded">GOOGLE_CLIENT_ID</code>と<code className="text-gray-500 bg-gray-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code>が必要です。
                  </p>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/40" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground italic">または「秘密メール」を使用（予備）</span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="bloggerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Blogger用秘密メールアドレス</FormLabel>
                      <FormControl>
                        <Input placeholder="○○○.△△△@blogger.com" {...field} />
                      </FormControl>
                      <FormDescription className="text-[10px] leading-tight mt-1">
                        環境変数が設定できない場合はこちらをご利用ください。Blogger設定 ＞ メール ＞ 「メールを使用して投稿」から取得したアドレスです。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            {/* Threads */}
            <Card className="bg-background/40 border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-black" />
                  Threads
                </CardTitle>
                <CardDescription>
                  MetaのThreadsに短い投稿を自動公開します。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3">
                  {userData?.threadsAccessToken || userData?.integrations?.threads?.isConnected ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md border border-green-100 mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      連携済み (ID: {userData?.threadsUserId || '不明'})
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      下記のボタンを押し、ご自身のInstagram/Threadsアカウントで投稿権限を承認するだけで連携が完了します。
                    </p>
                  )}
                  
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full border-black/20 text-black font-semibold hover:bg-black hover:text-white transition-colors"
                    onClick={() => {
                      window.location.href = `${window.location.origin}/api/auth/threads?userId=${user?.uid}&slotId=${activeSlot}`;
                    }}
                  >
                    {form.getValues('threadsAccessToken') ? 'Threadsと再連携する' : 'Threadsと連携する（全自動）'}
                  </Button>
                  
                  <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-md">
                    <p className="text-[10px] font-bold text-blue-700 mb-2">【救済策】連携エラーが出る場合</p>
                    <p className="text-[9px] text-blue-600 mb-2">
                      上のボタンを押して「このサイトは安全に接続できません」と出たら、その画面の**URLバーの内容をすべてコピー**して、下の欄に貼り付けてください。
                    </p>
                    <Input 
                      placeholder="https://... のURLを貼り付け" 
                      className="h-8 text-[10px]"
                      onChange={(e) => {
                        const url = e.target.value;
                        if (url.includes('threads_token=')) {
                          const token = url.split('threads_token=')[1]?.split('&')[0];
                          const userId = url.match(/threads_user_id=([^&]+)/)?.[1];
                          if (token) {
                            form.setValue('threadsAccessToken', token);
                            if (userId) form.setValue('threadsUserId', userId);
                            toast({ title: 'URLからトークンを抽出しました。一番下の「保存」を押して完了してください。' });
                          }
                        }
                      }}
                    />
                  </div>
                  
                  <div className="mt-2 text-center">
                    <button 
                      type="button" 
                      onClick={() => setShowManualThreads(!showManualThreads)}
                      className="text-[10px] text-muted-foreground hover:text-primary underline"
                    >
                      {showManualThreads ? '手動入力を閉じる' : '手動でトークンを別途入力・修正する'}
                    </button>
                  </div>

                  {(showManualThreads || userData?.threadsAccessToken) && (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-md border border-border/50 mt-2">
                      <FormField
                        control={form.control}
                        name="threadsUserId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px]">Threads ユーザーID</FormLabel>
                            <FormControl><Input placeholder="sayaka_mama01 のようなID" {...field} className="h-8 text-xs" /></FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="threadsAccessToken"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px]">アクセス・トークン</FormLabel>
                            <FormControl><Input type="password" placeholder="Meta開発者画面で生成したトークン" {...field} className="h-8 text-xs" /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pinterest */}
            <Card className="bg-background/40 border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-600" />
                  Pinterest
                </CardTitle>
                <CardDescription>
                  画像をPinとして保存し、ブログへ誘導します。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3">
                  {userData?.pinterestAccessToken || userData?.integrations?.pinterest?.isConnected ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md border border-green-100">
                      <CheckCircle2 className="h-4 w-4" />
                      連携済み
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Pinterest AppのClient IDを入力して保存した後、連携ボタンを押してください。
                    </p>
                  )}

                  <FormField
                    control={form.control}
                    name="pinterestClientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px]">Client ID</FormLabel>
                        <FormControl><Input placeholder="7桁から10桁程度の数値ID" {...field} className="h-8 text-xs" /></FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {(userData?.pinterestAccessToken || userData?.integrations?.pinterest?.isConnected) && (
                    <FormField
                      control={form.control}
                      name="pinterestBoardId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px]">保存先ボードID (任意)</FormLabel>
                          <FormControl><Input placeholder="自動取得する場合は空欄のままでOK" {...field} className="h-8 text-xs" /></FormControl>
                          <FormDescription className="text-[9px]">空欄の場合、あなたの最初のボードへ自動投稿されます。</FormDescription>
                        </FormItem>
                      )}
                    />
                  )}

                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full border-red-600/20 text-red-600 hover:bg-red-50 font-bold"
                    onClick={() => {
                      const clientId = form.getValues('pinterestClientId');
                      if (!clientId) {
                        toast({ title: 'Client IDを入力して保存してから連携してください', variant: 'destructive' });
                        return;
                      }
                      window.location.href = `/api/auth/pinterest?userId=${user?.uid}&clientId=${clientId}`;
                    }}
                  >
                    {userData?.pinterestAccessToken ? '再連携してトークンを更新' : 'Pinterestと連携する'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* WordPress & Hatena Section */}
        <div className="pt-8 border-t border-border/40 space-y-6">
          <h3 className="text-lg font-semibold">ブログ投稿の詳細設定</h3>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* WordPress */}
            <Card className="bg-background/20 border-border/40 flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" /> WordPress
                </CardTitle>
                <CardDescription className="text-xs">
                  ご自身のWordPressサイトに自動投稿します。<br />
                  <details className="mt-2 group">
                    <summary className="cursor-pointer text-primary hover:underline font-medium list-none flex items-center gap-1">
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">?</span> どうやって設定するの？
                    </summary>
                    <div className="mt-2 space-y-1.5 p-3 bg-muted/30 rounded-md text-muted-foreground leading-relaxed border border-border/50">
                      <p>1. いつも使っているご自身の<strong>WordPressの管理画面</strong>にログインします。</p>
                      <p>2. 左側のメニューから<strong>「ユーザー」→「プロフィール」</strong>を開きます。</p>
                      <p>3. 一番下までスクロールすると<strong>「アプリケーションパスワード」</strong>という項目があります。</p>
                      <p>4. 適当な名前（MIZUIROなど）を入力して「追加」を押すと、長い暗号が一度だけ表示されます。それが<strong>アプリケーションパスワード</strong>です。</p>
                    </div>
                  </details>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <FormField
                  control={form.control}
                  name="wordpressUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px]">サイトURL</FormLabel>
                      <FormControl><Input placeholder="https://your-site.com" {...field} className="h-8 text-xs" /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wordpressUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px]">ユーザー名</FormLabel>
                      <FormControl><Input placeholder="admin" {...field} className="h-8 text-xs" /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wordpressAppPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px]">アプリケーションパスワード</FormLabel>
                      <FormControl><Input type="password" placeholder="xxxx xxxx xxxx xxxx" {...field} className="h-8 text-xs" /></FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Hatena Blog */}
            <Card className="bg-background/20 border-border/40 flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PenSquare className="h-4 w-4 text-primary" /> はてなブログ
                </CardTitle>
                <CardDescription className="text-xs">
                  はてなブログに自動投稿します。一番簡単な<strong>「メールで投稿」</strong>を推奨します。<br />
                  <details className="mt-2 group">
                    <summary className="cursor-pointer text-primary hover:underline font-medium list-none flex items-center gap-1">
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">?</span> 設定方法
                    </summary>
                    <div className="mt-2 space-y-1.5 p-3 bg-muted/30 rounded-md text-muted-foreground leading-relaxed border border-border/50">
                      <p>1. <a href="https://blog.hatena.ne.jp/-/config" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">はてなブログの設定画面</a>を開きます。</p>
                      <p>2. 上部の<strong>「基本設定」</strong>をクリックします。</p>
                      <p>3. ページの中盤にある<strong>「メール投稿」</strong>欄にある投稿用のアドレスをコピーしてください。</p>
                      <p>※ 設定されていない場合は英数字を適当に入力して保存すると発行されます。</p>
                    </div>
                  </details>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-md">
                  <p className="font-semibold text-primary mb-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> API方式で連携します
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    はてなブログのAtomPub APIを使用して、直接ハイクオリティな記事を公開します。
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="hatenaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px]">はてなID</FormLabel>
                      <FormControl><Input placeholder="hatena-id" {...field} className="h-8 text-xs" /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hatenaBlogId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px]">ブログID</FormLabel>
                      <FormControl><Input placeholder="example.hatenablog.com" {...field} className="h-8 text-xs" /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hatenaApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px]">APIキー (AtomPub)</FormLabel>
                      <FormControl><Input type="password" placeholder="api-key" {...field} className="h-8 text-xs" /></FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="pt-8 flex justify-end items-center gap-4">
            <p className="text-xs text-muted-foreground italic">※ 入力内容を今一度ご確認の上、保存ボタンを押してください</p>
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="min-w-[200px] shadow-xl shadow-primary/30 h-14 text-base font-bold">
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle2 className="mr-2 h-5 w-5" />
              設定をすべて保存
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
