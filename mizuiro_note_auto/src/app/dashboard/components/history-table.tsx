'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { collection, query, where, orderBy, limit } from 'firebase/firestore'
import { Globe, Share2, Instagram, Pin, Layout, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

const platformIcons: Record<string, any> = {
  blogger: { icon: Globe, color: 'text-orange-500', bg: 'bg-orange-50' },
  threads: { icon: Instagram, color: 'text-black', bg: 'bg-gray-100' },
  pinterest: { icon: Pin, color: 'text-red-600', bg: 'bg-red-50' },
  wordpress: { icon: Layout, color: 'text-blue-500', bg: 'bg-blue-50' },
  hatena: { icon: Share2, color: 'text-primary', bg: 'bg-primary/5' },
}

export function HistoryTable() {
  const { user } = useUser()
  const firestore = useFirestore()

  const historyQuery = useMemoFirebase(() => {
    if (!user) return null
    return query(
      collection(firestore, 'activities'),
      where('userId', '==', user.uid),
      limit(50)
    )
  }, [firestore, user])

  const { data: history, isLoading } = useCollection(historyQuery)

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm h-full">
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm h-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg">投稿履歴</CardTitle>
        <CardDescription>最近10件の配信実績</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 p-6">
        {!history || history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            まだ投稿履歴がありません。<br />
            コンテンススタジオから投稿を開始しましょう！
          </div>
        ) : (
          [...history]
          .sort((a, b) => {
            const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
            const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
            return timeB - timeA;
          })
          .slice(0, 10)
          .map((item, index) => {
            const config = platformIcons[item.platform] || { icon: Globe, color: 'text-gray-400', bg: 'bg-gray-50' }
            const Icon = config.icon
            
            return (
              <div key={item.id || index} className="flex items-center gap-4 group transition-all hover:bg-white/5 p-2 rounded-lg -m-2">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bg} ${config.color} shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="grid gap-1 flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-none truncate pr-2" title={item.productName}>
                    {item.productName}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{item.timestamp?.toDate ? format(item.timestamp.toDate(), 'MM/dd HH:mm', { locale: ja }) : 'Just now'}</span>
                    <span>•</span>
                    <span className="capitalize">{item.platform}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  {item.status === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
