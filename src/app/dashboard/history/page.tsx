'use client'

import { useState } from 'react'
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { History, Loader2, Trash2, ExternalLink, Eye, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { deleteActivity } from '@/lib/activity-logger'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from '@/components/ui/scroll-area'
import { marked } from 'marked'

export default function HistoryPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const [selectedLog, setSelectedLog] = useState<any>(null)

  // activitiesコレクション（ログ）を読み込むように変更
  const logsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return query(
      collection(firestore, 'users', user.uid, 'posts'),
      orderBy('createdAt', 'desc')
    )
  }, [firestore, user])

  const { data: logs, isLoading, error, refetch } = useCollection(logsQuery)

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!user) return
    if (!window.confirm('このログを削除しますか？')) return

    try {
      await deleteActivity(user.uid, id)
      toast({ title: 'ログを削除しました' })
      refetch?.()
    } catch (err) {
      toast({ title: '削除に失敗しました', variant: 'destructive' })
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">ログを読み込み中...</p>
        </div>
      )
    }

    if (!logs || logs.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
          <p className="text-muted-foreground">作業ログ（投稿履歴）はまだありません。</p>
        </div>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {logs.map(log => (
          <Card 
            key={log.id} 
            className="flex flex-col bg-background/50 hover:border-primary/50 transition-colors cursor-pointer group"
            onClick={() => setSelectedLog(log)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start mb-2">
                <Badge variant={log.status === 'success' ? 'default' : (log.status === 'failed' ? 'destructive' : 'secondary')} className="gap-1">
                  {log.status === 'success' ? <CheckCircle2 className="h-3 w-3" /> : (log.status === 'failed' ? <XCircle className="h-3 w-3" /> : <Loader2 className="h-3 w-3" />)}
                  {(log.platform || 'POST').toUpperCase()}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(e, log.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="text-sm line-clamp-2 leading-tight">
                {log.productName}
              </CardTitle>
              <CardDescription className="text-[10px]">
                {log.createdAt?.toDate
                  ? `${formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true, locale: ja })}`
                  : '日付不明'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow pb-2">
              {log.imageUrl && (
                <div className="aspect-video w-full rounded-md overflow-hidden border mb-2">
                  <img src={log.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-xs font-semibold line-clamp-1">{log.postTitle}</p>
            </CardContent>
            <CardFooter className="pt-0 flex justify-between items-center text-[10px] text-muted-foreground">
              <span>{log.itemPrice?.toLocaleString() ?? '- '}円</span>
              <div className="flex gap-2">
                <Eye className="h-3 w-3" />
                <span>クリックで詳細表示</span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-6 w-6 text-primary" /> 作業ログ (投稿履歴)
          </CardTitle>
          <CardDescription>
            過去の投稿内容、ステータス、生成された文章の記録です。
          </CardDescription>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>

      {/* 詳細ダイアログ */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          {selectedLog && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{(selectedLog.platform || 'POST').toUpperCase()}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {(selectedLog.createdAt || selectedLog.timestamp)?.toDate()?.toLocaleString() || '日付不明'}
                  </span>
                </div>
                <DialogTitle>{selectedLog.postTitle || selectedLog.productName}</DialogTitle>
                <DialogDescription>
                  投稿された内容の控えです。
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="h-[500px] mt-4 p-4 rounded-md border bg-muted/30">
                <div className="space-y-6">
                  {selectedLog.imageUrl && (
                    <div className="max-w-sm mx-auto rounded-lg overflow-hidden border-2 shadow-sm">
                      <img src={selectedLog.imageUrl} alt="" className="w-full" />
                    </div>
                  )}
                  
                  {selectedLog.postContent ? (
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: marked.parse(selectedLog.postContent) }} 
                    />
                  ) : (
                    <p className="text-center text-muted-foreground italic">記事の本文記録はありません</p>
                  )}

                  <div className="pt-4 border-t space-y-2">
                    <p className="text-xs font-semibold">対象商品: {selectedLog.productName}</p>
                    <Button variant="link" size="sm" className="h-auto p-0" asChild>
                      <a href={selectedLog.itemUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                        楽天商品ページ <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </ScrollArea>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setSelectedLog(null)}>閉じる</Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={(e) => { 
                    handleDelete(e, selectedLog.id); 
                    setSelectedLog(null); 
                  }}
                >
                  このログを削除
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
