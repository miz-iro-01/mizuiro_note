'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { doc } from 'firebase/firestore'
import { Logo } from '@/components/icons'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { marked } from 'marked'
import { useMemo } from 'react'

export default function PrivacyPolicyPage() {
  const firestore = useFirestore()
  const privacyRef = useMemoFirebase(() => doc(firestore, 'system', 'privacy'), [firestore])
  const { data, isLoading } = useDoc(privacyRef, { suppressGlobalError: true })

  const htmlContent = useMemo(() => {
    if (!data?.content) return ''
    return marked(data.content)
  }, [data?.content])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4 shadow-inner">
      <div className="absolute top-4 left-4">
        <Link href="/">
           <Logo />
        </Link>
      </div>

      <div className="w-full max-w-3xl mt-12">
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center pb-8 border-b border-border/40">
            <CardTitle className="text-3xl font-bold tracking-tight">プライバシーポリシー</CardTitle>
          </CardHeader>
          <CardContent className="p-8 sm:p-12">
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
              </div>
            ) : htmlContent ? (
              <div 
                className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-a:text-primary hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: htmlContent }} 
              />
            ) : (
              <div className="text-center text-muted-foreground italic h-48 flex items-center justify-center">
                現在、プライバシーポリシーは準備中です。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
