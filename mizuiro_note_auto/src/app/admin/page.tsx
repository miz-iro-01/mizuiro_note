'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Shield, Save, Loader2, Users, Settings, FileText, Plus, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useFirestore, useUser, useAuth, useMemoFirebase, useDoc } from '@/firebase'
import { doc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

const ADMIN_EMAILS = ['oumaumauma32@gmail.com', 'sl0wmugi9@gmail.com']

export default function AdminPage() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const firestore = useFirestore()
  const auth = useAuth()
  const { toast } = useToast()

  const [isSaving, setIsSaving] = useState(false)
  
  // States for Tabs and Unsaved confirmation
  const [activeTab, setActiveTab] = useState('stripe')
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [stripeSecret, setStripeSecret] = useState('')
  const [stripePublic, setStripePublic] = useState('')
  const [stripeWebhook, setStripeWebhook] = useState('')
  const [stripeStandardPrice, setStripeStandardPrice] = useState('')
  const [stripeProPrice, setStripeProPrice] = useState('')
  
  const [invitedEmail, setInvitedEmail] = useState('')
  const [invitedList, setInvitedList] = useState<string[]>([])
  
  const [privacyPolicy, setPrivacyPolicy] = useState('')

  // References (読み取り用のみ)
  const stripeSettingsRef = useMemoFirebase(() => doc(firestore, 'system', 'stripe'), [firestore])
  const inviteSettingsRef = useMemoFirebase(() => doc(firestore, 'system', 'invitations'), [firestore])
  const privacySettingsRef = useMemoFirebase(() => doc(firestore, 'system', 'privacy'), [firestore])

  // Fetching Document Data (読み取りはクライアント側で行う)
  const { data: stripeData, isLoading: stripeLoading } = useDoc(stripeSettingsRef, { suppressGlobalError: true })
  const { data: inviteData, isLoading: inviteLoading } = useDoc(inviteSettingsRef, { suppressGlobalError: true })
  const { data: privacyData, isLoading: privacyLoading } = useDoc(privacySettingsRef, { suppressGlobalError: true })

  // Initialize data
  useEffect(() => {
    if (stripeData) {
      setStripeSecret(stripeData.secretKey || '')
      setStripePublic(stripeData.publicKey || '')
      setStripeWebhook(stripeData.webhookSecret || '')
      setStripeStandardPrice(stripeData.standardPriceId || '')
      setStripeProPrice(stripeData.proPriceId || '')
    }
    if (inviteData && Array.isArray(inviteData.emails)) {
      setInvitedList(inviteData.emails)
    }
    if (privacyData) {
      setPrivacyPolicy(privacyData.content || '')
    }
  }, [stripeData, inviteData, privacyData])

  // Access Control
  useEffect(() => {
    if (!isUserLoading && user) {
      if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
        toast({ variant: 'destructive', title: 'アクセス拒否', description: '管理者権限がありません。' })
        router.push('/dashboard')
      }
    } else if (!isUserLoading && !user) {
      router.push('/login')
    }
  }, [user, isUserLoading, router, toast])

  /**
   * サーバーサイドAPI経由で system コレクションに設定を保存する共通関数。
   * Firebase Admin SDK を使用してルールをバイパスするため、権限エラーが発生しない。
   */
  const saveViaApi = useCallback(async (documentId: string, data: Record<string, any>) => {
    if (!user) throw new Error('ログインが必要です')
    
    // Firebase Auth のIDトークンを取得
    const idToken = await user.getIdToken()
    
    const response = await fetch('/api/admin/save-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        collection: 'system',
        documentId,
        data,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '保存に失敗しました')
    }

    return response.json()
  }, [user])

  const hasUnsavedChanges = useCallback(() => {
    if (activeTab === 'stripe') {
      return stripeSecret.trim() !== (stripeData?.secretKey || '') ||
             stripePublic.trim() !== (stripeData?.publicKey || '') ||
             stripeWebhook.trim() !== (stripeData?.webhookSecret || '') ||
             stripeStandardPrice.trim() !== (stripeData?.standardPriceId || '') ||
             stripeProPrice.trim() !== (stripeData?.proPriceId || '');
    }
    if (activeTab === 'privacy') {
      return privacyPolicy !== (privacyData?.content || '');
    }
    return false;
  }, [activeTab, stripeSecret, stripePublic, stripeWebhook, stripeStandardPrice, stripeProPrice, privacyPolicy, stripeData, privacyData]);

  if (isUserLoading || stripeLoading || inviteLoading || privacyLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) return null

  const handleSaveStripe = async () => {
    setIsSaving(true)
    try {
      await saveViaApi('stripe', {
        secretKey: stripeSecret.trim(),
        publicKey: stripePublic.trim(),
        webhookSecret: stripeWebhook.trim(),
        standardPriceId: stripeStandardPrice.trim(),
        proPriceId: stripeProPrice.trim(),
      })
      toast({ title: 'Stripe設定を保存しました' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: '保存失敗', description: e.message })
    } finally { setIsSaving(false) }
  }

  const handleSavePrivacy = async () => {
    setIsSaving(true)
    try {
      await saveViaApi('privacy', {
        content: privacyPolicy,
      })
      toast({ title: 'プライバシーポリシーを保存しました' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: '保存失敗', description: e.message })
    } finally { setIsSaving(false) }
  }



  const handleTabChange = (value: string) => {
    if (value === activeTab) return;
    
    if (hasUnsavedChanges()) {
      setPendingTab(value);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(value);
    }
  }

  const handleSaveAndSwitch = async () => {
    if (activeTab === 'stripe') await handleSaveStripe();
    if (activeTab === 'privacy') await handleSavePrivacy();
    
    setShowUnsavedDialog(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  }

  const handleDiscardAndSwitch = () => {
    // 変更を破棄（初期値に戻す）
    if (activeTab === 'stripe') {
      setStripeSecret(stripeData?.secretKey || '')
      setStripePublic(stripeData?.publicKey || '')
      setStripeWebhook(stripeData?.webhookSecret || '')
      setStripeStandardPrice(stripeData?.standardPriceId || '')
      setStripeProPrice(stripeData?.proPriceId || '')
    }
    if (activeTab === 'privacy') {
      setPrivacyPolicy(privacyData?.content || '')
    }

    setShowUnsavedDialog(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  }

  const handleAddInvite = async () => {
    if (!invitedEmail) return
    const newList = [...new Set([...invitedList, invitedEmail.trim()])]
    setInvitedList(newList)
    setInvitedEmail('')
    await saveInvitations(newList)
  }

  const handleRemoveInvite = async (email: string) => {
    const newList = invitedList.filter(e => e !== email)
    setInvitedList(newList)
    await saveInvitations(newList)
  }

  const saveInvitations = async (list: string[]) => {
    setIsSaving(true)
    try {
      await saveViaApi('invitations', {
        emails: list,
      })
      toast({ title: '招待リストを更新しました' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: '保存失敗', description: e.message })
    } finally { setIsSaving(false) }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-500" /> 特権管理者パネル
          </CardTitle>
          <CardDescription>
            システム全体の決済、権限、ポリシーを管理します。変更は即座に本番環境に反映されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="mb-6 grid grid-cols-3 w-full">
              <TabsTrigger value="stripe" className="gap-2"><Settings className="h-4 w-4"/> Stripe設定</TabsTrigger>
              <TabsTrigger value="invites" className="gap-2"><Users className="h-4 w-4"/> 招待・権限</TabsTrigger>
              <TabsTrigger value="privacy" className="gap-2"><FileText className="h-4 w-4"/> ポリシー管理</TabsTrigger>
            </TabsList>

            {/* STRIPE TAB */}
            <TabsContent value="stripe" className="space-y-4">
               <div className="space-y-4 bg-muted/30 p-6 rounded-lg border border-border/50">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stripe シークレットキー (sk_live_... / sk_test_...)</label>
                    <Input type="password" value={stripeSecret} onChange={e => setStripeSecret(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stripe 公開キー (pk_live_... / pk_test_...)</label>
                    <Input type="text" value={stripePublic} onChange={e => setStripePublic(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Webhook シークレット (whsec_...)</label>
                    <Input type="password" value={stripeWebhook} onChange={e => setStripeWebhook(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">スタンダードプラン Price ID (price_...)</label>
                    <Input value={stripeStandardPrice} onChange={e => setStripeStandardPrice(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Proプラン Price ID (price_...)</label>
                    <Input value={stripeProPrice} onChange={e => setStripeProPrice(e.target.value)} />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveStripe} disabled={isSaving} className="gap-2">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>} 保存
                    </Button>
                  </div>
               </div>
            </TabsContent>

            {/* INVITES TAB */}
            <TabsContent value="invites" className="space-y-4">
               <div className="bg-muted/30 p-6 rounded-lg border border-border/50 space-y-6">
                 <div>
                   <label className="text-sm font-medium">招待メールアドレスの追加</label>
                   <p className="text-xs text-muted-foreground mb-2">ここに登録されたメールアドレスでログインしたユーザーは、クレジットカード登録をスキップし、最初からProプラン扱いになります。</p>
                   <div className="flex gap-2">
                     <Input placeholder="user@example.com" value={invitedEmail} onChange={e => setInvitedEmail(e.target.value)} 
                       onKeyDown={(e) => e.key === 'Enter' && handleAddInvite()}
                     />
                     <Button onClick={handleAddInvite} disabled={isSaving || !invitedEmail}><Plus className="h-4 w-4 mr-2"/>追加</Button>
                   </div>
                 </div>
                 
                 <div className="space-y-2">
                   <p className="text-sm font-medium">登録済み招待リスト ({invitedList.length}件)</p>
                   {invitedList.length === 0 && <p className="text-xs text-muted-foreground italic">現在登録されていません</p>}
                   <ul className="space-y-2">
                     {invitedList.map(email => (
                       <li key={email} className="flex items-center justify-between bg-background p-2 rounded border text-sm">
                         {email}
                         <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveInvite(email)}>
                           <X className="h-4 w-4" />
                         </Button>
                       </li>
                     ))}
                   </ul>
                 </div>
               </div>
            </TabsContent>

            {/* PRIVACY POLICY TAB */}
            <TabsContent value="privacy" className="space-y-4">
               <div className="bg-muted/30 p-6 rounded-lg border border-border/50 space-y-4">
                 <div>
                   <label className="text-sm font-medium">プライバシーポリシー (Markdown形式対応)</label>
                   <p className="text-xs text-muted-foreground mb-2">トップページのフッターリンクから表示される内容です。</p>
                   <Textarea 
                     className="min-h-[400px] font-mono text-sm" 
                     value={privacyPolicy} 
                     onChange={e => setPrivacyPolicy(e.target.value)} 
                     placeholder="# プライバシーポリシー&#10;&#10;当サイトは..."
                   />
                 </div>
                 <div className="flex justify-end">
                    <Button onClick={handleSavePrivacy} disabled={isSaving} className="gap-2">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>} ポリシー公開
                    </Button>
                  </div>
               </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>保存されていない変更があります</AlertDialogTitle>
            <AlertDialogDescription>
              タブを移動する前に、現在の変更を保存しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowUnsavedDialog(false);
              setPendingTab(null);
            }}>
              キャンセル
            </AlertDialogCancel>
            <Button variant="destructive" onClick={handleDiscardAndSwitch}>
              保存せずに移動
            </Button>
            <AlertDialogAction onClick={handleSaveAndSwitch}>
              保存して移動
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
