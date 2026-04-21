'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MailCheck, RefreshCcw } from 'lucide-react'
import { Logo } from '@/components/icons'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth, useUser, useFirestore, setDocumentNonBlocking } from '@/firebase'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { doc, serverTimestamp } from 'firebase/firestore'
import { initiateGoogleSignIn } from '@/firebase'

const signupFormSchema = z.object({
  email: z.string().email({ message: '有効なメールアドレスを入力してください。' }),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください。'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません。',
  path: ['confirmPassword'],
});

export default function SignupPage() {
  const { toast } = useToast()
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAwaitingVerification, setIsAwaitingVerification] = useState(false)
  const [reloadLoading, setReloadLoading] = useState(false)

  // 認証済みかどうかの確認
  useEffect(() => {
    if (!isUserLoading && user) {
      if (user.emailVerified) {
         router.push('/dashboard')
      } else {
         setIsAwaitingVerification(true)
      }
    }
  }, [user, isUserLoading, router])

  const form = useForm<z.infer<typeof signupFormSchema>>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  function onSubmit(data: z.infer<typeof signupFormSchema>) {
    if (!auth || !firestore) return;
    setIsSubmitting(true);

    createUserWithEmailAndPassword(auth, data.email, data.password)
      .then(async (userCredential) => {
        const newUser = userCredential.user;
        
        // 認証メール送信
        await sendEmailVerification(newUser);
        
        // Firestoreへのユーザー登録を先行（決済状態は別途）
        const userDocRef = doc(firestore, 'users', newUser.uid);
        setDocumentNonBlocking(userDocRef, {
            id: newUser.uid,
            email: newUser.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            paymentStatus: 'trialing',
            rakutenApplicationId: '',
        }, { merge: true });

        setIsAwaitingVerification(true);
        setIsSubmitting(false);
      })
      .catch((error) => {
        const errorCode = error.code;
        let errorMessage = 'アカウントの作成に失敗しました。';
        if (errorCode === 'auth/email-already-in-use') {
            errorMessage = 'このメールアドレスは既に使用されています。'
        } else if (errorCode === 'auth/weak-password') {
            errorMessage = 'パスワードが弱すぎます。'
        }
        toast({ variant: 'destructive', title: 'エラー', description: errorMessage })
        setIsSubmitting(false)
      })
  }

  function onGoogleLogin() {
    if (!auth) return
    initiateGoogleSignIn(auth, () => {
      setIsSubmitting(false)
    })
  }

  const checkVerification = async () => {
    if (!user) return;
    setReloadLoading(true);
    await user.reload(); // Firebaseから最新状態を取得
    if (user.emailVerified) {
      toast({ title: '認証完了', description: 'メール認証が完了しました。' })
      router.push('/dashboard');
    } else {
      toast({ variant: 'destructive', title: '未認証', description: 'まだメール認証が完了していません。リンクをクリックしたか確認してください。' })
    }
    setReloadLoading(false);
  }

  const handleResend = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      toast({ title: '再送信', description: '認証メールを再送信しました。' })
    } catch (e) {
      toast({ variant: 'destructive', title: 'エラー', description: '時間をおいて再度お試しください。' })
    }
  }

  if (isUserLoading || (user && user.emailVerified)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAwaitingVerification) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="absolute top-4 left-4"><Logo /></div>
        <Card className="w-full max-w-md shadow-lg border-primary/20 text-center">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
               <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                 <MailCheck className="h-8 w-8" />
               </div>
            </div>
            <CardTitle className="text-2xl">メール認証が必要です</CardTitle>
            <CardDescription className="text-base text-foreground/80 pt-2">
              ご登録いただいたメールアドレス宛に、システムから確認用リンクを送信しました。<br/><br/>
              メールアプリを開き、**リンクをクリックして認証を完了**させてください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <Button onClick={checkVerification} disabled={reloadLoading} className="w-full h-12 text-md font-bold">
              {reloadLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <RefreshCcw className="mr-2 h-5 w-5" />}
              認証したあとにここを押す
            </Button>
            <Button variant="ghost" onClick={handleResend} className="text-sm text-muted-foreground w-full">
              メールが届かない場合は再送信
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="absolute top-4 left-4">
        <Logo />
       </div>
       <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>新規登録</CardTitle>
          <CardDescription>新しいアカウントを作成します。</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>メールアドレス</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>パスワード</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="8文字以上" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>パスワード（確認用）</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="パスワードを再入力" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                登録する
              </Button>
            </form>
          </Form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                または
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            type="button"
            className="w-full"
            onClick={onGoogleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
            )}
            Googleで登録
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            すでにアカウントをお持ちですか？{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              ログイン
            </Link>
          </p>
        </CardContent>
       </Card>
    </div>
  )
}
