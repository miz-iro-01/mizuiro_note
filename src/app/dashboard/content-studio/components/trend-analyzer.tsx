'use client'

import { useState, useMemo, useEffect } from 'react'
import { Bot, Loader2, Sparkles, Pin, AtSign } from 'lucide-react'
import {
  identifyTrendingTopics,
  type IdentifyTrendingTopicsOutput,
} from '@/ai/flows/identify-trending-topics'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase'
import { doc } from 'firebase/firestore'
import Link from 'next/link'

interface TrendAnalyzerProps {
  onKeywordSelect?: (keyword: string) => void;
}

export default function TrendAnalyzer({ onKeywordSelect }: TrendAnalyzerProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<IdentifyTrendingTopicsOutput['topics'] | null>(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('mizuiro_trend_results') : null
    return saved ? JSON.parse(saved) : null
  })

  // 結果が変わるたびに保存
  useMemo(() => {
    if (results) {
      sessionStorage.setItem('mizuiro_trend_results', JSON.stringify(results))
    }
  }, [results])
  const { toast } = useToast()
  const { user } = useUser()
  const firestore = useFirestore()

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(firestore, 'users', user.uid)
  }, [firestore, user])
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userData?.googleApiKey) {
      toast({
        variant: 'destructive',
        title: 'Google APIキーがありません',
        description: (
          <p>
            AI機能を利用するにはAPIキーが必要です。{' '}
            <Link href="/dashboard/settings?tab=integrations" className="underline">
              設定ページ
            </Link>
            {' '}でキーを追加してください。
          </p>
        ),
      })
      return
    }

    setIsLoading(true)
    setResults(null)
    try {
      const res = await identifyTrendingTopics({
        searchQuery: query,
        googleApiKey: userData.googleApiKey,
      })
      setResults(res.topics)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'エラーが発生しました。',
        description: error.message || 'トレンドトピックの特定に失敗しました。もう一度お試しください。',
      })
      console.error('Failed to identify trending topics', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderForm = () => {
    if (isUserDataLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )
    }
    if (!userData?.googleApiKey) {
        return (
            <div className="text-center text-sm text-muted-foreground p-4 rounded-lg border-2 border-dashed">
                <p>AI機能にはAPIキーが必要です。</p>
                <Button variant="link" asChild className="p-1 h-auto">
                    <Link href="/dashboard/settings?tab=integrations">設定ページでキーを追加</Link>
                </Button>
            </div>
        )
    }
    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
            placeholder="例: 'サステナブルな暮らし'"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading} size="icon">
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Sparkles className="h-4 w-4" />
            )}
            <span className="sr-only">分析</span>
            </Button>
        </form>
    )
  }

  return (
    <Card className="sticky top-24 border-border/50 bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-6 w-6" /> AIトレンドアナライザー
        </CardTitle>
        <CardDescription>
          PinterestとThreadsでクリックされやすいトピックを見つけます。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderForm()}
      </CardContent>

      <ScrollArea className="h-[calc(100vh-16rem)]">
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">トレンドを分析中...</p>
            </div>
          )}

          {!isLoading && !results && !isUserDataLoading && userData?.googleApiKey && (
             <div className="text-center text-sm text-muted-foreground p-8">
                <p>上の欄にトピックを入力して、トレンドのコンテンツアイデアを見つけましょう。</p>
            </div>
          )}
          
          {results?.map((topic, index) => (
            <div
              key={index}
              className="space-y-3 rounded-lg border bg-background/50 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{topic.title}</h3>
                <div className="flex gap-1.5">
                  {topic.platforms.includes('Pinterest') && <Pin className="h-4 w-4 text-red-500" />}
                  {topic.platforms.includes('Threads') && <AtSign className="h-4 w-4 text-gray-500" />}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {topic.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {topic.keywords.map((keyword: string) => (
                  <Badge 
                    key={keyword} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => onKeywordSelect?.(keyword)}
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  )
}
