'use client'

import { type GenerateSocialMediaPostOutput } from '@/ai/flows/generate-social-media-post'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Check, Clipboard, Image as ImageIcon, RefreshCw, Send, CalendarClock, Save, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase'
import { collection, serverTimestamp } from 'firebase/firestore'
import { type RakutenProduct } from '@/ai/flows/search-rakuten-products'


interface PostPreviewProps {
  post: GenerateSocialMediaPostOutput;
  topic: string;
  persona: any;
  rakutenProduct: RakutenProduct | null;
}

export default function PostPreview({ post, topic, persona, rakutenProduct }: PostPreviewProps) {
  const { toast } = useToast()
  const [copiedText, setCopiedText] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { user } = useUser()
  const firestore = useFirestore()

  const handleCopy = (content: string, type: 'text' | 'prompt') => {
    navigator.clipboard.writeText(content)
    if (type === 'text') {
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    } else {
      setCopiedPrompt(true)
      setTimeout(() => setCopiedPrompt(false), 2000)
    }
    toast({ title: 'クリップボードにコピーしました！' })
  }

  const handleSaveDraft = () => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'エラー', description: '投稿を保存するにはログインが必要です。' });
        return;
    }
    setIsSaving(true);
    const postCollectionRef = collection(firestore, 'users', user.uid, 'posts');
    
    const postData = {
        userId: user.uid,
        topic: topic,
        postText: post.postText,
        imagePrompt: post.imagePrompt,
        persona: persona,
        rakutenProduct: rakutenProduct || null,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    try {
      addDocumentNonBlocking(postCollectionRef, postData);
      toast({ title: '成功', description: '下書きを保存しました。履歴ページで確認できます。' });
    } catch(e) {
       toast({ variant: 'destructive', title: 'エラー', description: '下書きの保存に失敗しました。' });
    } finally {
       setIsSaving(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>生成されたコンテンツ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">投稿テキスト</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(post.postText, 'text')}
            >
              {copiedText ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
            </Button>
          </div>
          <Textarea
            defaultValue={post.postText}
            className="min-h-[150px] bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">画像プロンプト</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(post.imagePrompt, 'prompt')}
            >
             {copiedPrompt ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
            </Button>
          </div>
          <Card className="bg-background/50 p-4">
            <p className="text-sm text-muted-foreground">{post.imagePrompt}</p>
          </Card>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button>
            <Send className="mr-2 h-4 w-4" /> 今すぐ投稿
          </Button>
          <Button variant="secondary">
            <CalendarClock className="mr-2 h-4 w-4" /> 予約する
          </Button>
          <Button variant="secondary" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            下書きとして保存
          </Button>
          <Button variant="outline">
            <ImageIcon className="mr-2 h-4 w-4" /> 画像を生成
          </Button>
           <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <RefreshCw className="mr-2 h-4 w-4" /> 再生成
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
