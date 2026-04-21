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
import { Loader2 } from 'lucide-react'
import { Logo } from '@/components/icons'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth, useUser } from '@/firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { initiateGoogleSignIn } from '@/firebase'

const loginFormSchema = z.object({
  email: z.string().email({ message: '有効なメールアドレスを入力してください。' }),
  password: z.string().min(1, 'パスワードは必須です。'),
})

export default function LoginPage() {
  const { toast } = useToast()
  const auth = useAuth()
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [blockRedirect, setBlockRedirect] = useState(false)

  useEffect(() => {
    // blockRedirectがtrueの場合は、Google認証後の自動リダイレクトを待機させる
    if (!blockRedirect && !isUserLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isUserLoading, router, blockRedirect])

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  function onSubmit(data: z.infer<typeof loginFormSchema>) {
    if (!auth) return
    setIsSubmitting(true)

    signInWithEmailAndPassword(auth, data.email, data.password)
      .then(() => {
        // Signed in succeeds, but useEffect handles redirection
      })
      .catch((error) => {
        const errorCode = error.code;
        let errorMessage = 'ログインに失敗しました。';
        if (errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません。'
        }
        toast({
          variant: 'destructive',
          title: 'エラー',
          description: errorMessage,
        })
        setIsSubmitting(false)
      })
  }

  function onGoogleLogin() {
    if (!auth) return
    setIsSubmitting(true)
    setBlockRedirect(true) // リダイレクトを一時停止
    initiateGoogleSignIn(auth, "1", (isNewUser, userTarget) => {
      if (isNewUser && userTarget) {
        // 新規ユーザーがログイン画面から来た場合は破棄して新規登録へ案内する
        userTarget.delete().then(() => {
          toast({
            variant: 'destructive',
            title: '未登録のアカウントです',
            description: 'データが見つかりません。まずは「新規登録」からアカウントを作成してください。'
          })
          setIsSubmitting(false)
          setBlockRedirect(false)
        }).catch(() => {
          setIsSubmitting(false)
          setBlockRedirect(false)
        })
      } else {
        setIsSubmitting(false)
        setBlockRedirect(false)
        // 既存ユーザーとして正常にログインした場合は手動で遷移
        if (!isNewUser) {
           router.push('/dashboard')
        }
      }
    })
  }
  
  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="absolute top-4 left-4">
        <Logo />
       </div>
       <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>ログイン</CardTitle>
          <CardDescription>アカウントにログインしてください。</CardDescription>
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
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                ログイン
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
            Googleでログイン
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            アカウントをお持ちでないですか？{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              新規登録
            </Link>
          </p>
        </CardContent>
       </Card>
    </div>
  )
}
