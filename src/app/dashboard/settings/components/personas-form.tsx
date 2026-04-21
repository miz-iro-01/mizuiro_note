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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { collection, doc, serverTimestamp, getDoc } from 'firebase/firestore'
import { useCollection, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase'
import { Loader2, Trash2, PlusCircle, Sparkles, Wand2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useState } from 'react'
import { generatePersona } from '@/ai/flows/generate-persona'

const personaFormSchema = z.object({
  name: z.string().min(1, 'ペルソナの名前は必須です。'),
  tone: z.string().min(1, '発信トーンは必須です。'),
  imageStyle: z.string().min(1, '画像スタイルは必須です。'),
  targetAudience: z.string().min(1, 'ターゲット像は必須です。'),
  description: z.string().optional(),
})

export default function PersonasForm() {
  const { toast } = useToast()
  const { user } = useUser()
  const firestore = useFirestore()
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  
  const personasCollectionRef = useMemoFirebase(() => {
    if (!user) return null
    return collection(firestore, 'users', user.uid, 'personas')
  }, [firestore, user])

  const { data: personas, isLoading: isLoadingPersonas } = useCollection(personasCollectionRef)

  const form = useForm<z.infer<typeof personaFormSchema>>({
    resolver: zodResolver(personaFormSchema),
    defaultValues: {
      name: '',
      tone: '',
      imageStyle: '',
      targetAudience: '',
      description: '',
    },
  })

  // AI Persona Generation
  const handleAiGenerate = async () => {
    if (!aiTopic) {
      toast({ variant: 'destructive', title: 'トピックを入力してください', description: 'どのようなジャンルの発信をするか入力してください。' })
      return
    }

    if (!user) return

    setIsAiGenerating(true)
    try {
      // ユーザー設定からGoogle APIキーを取得
      const userDoc = await getDoc(doc(firestore, 'users', user.uid))
      const apiKey = userDoc.data()?.googleApiKey
      
      if (!apiKey) {
        toast({ 
          variant: 'destructive', 
          title: 'Google APIキー未設定', 
          description: '設定ページでAPIキーを設定する必要があります。' 
        })
        return
      }

      const generated = await generatePersona({
        topic: aiTopic,
        googleApiKey: apiKey
      })

      form.reset({
        name: generated.name,
        tone: generated.tone,
        imageStyle: generated.imageStyle,
        targetAudience: generated.targetAudience,
        description: generated.description,
      })

      toast({ title: 'AI生成完了', description: 'ペルソナの詳細項目を自動入力しました。内容を確認して保存してください。' })
    } catch (error: any) {
      console.error('AI Persona generation error:', error)
      toast({ variant: 'destructive', title: '生成エラー', description: 'ペルソナの自動生成に失敗しました。' })
    } finally {
      setIsAiGenerating(false)
    }
  }

  function onSubmit(data: z.infer<typeof personaFormSchema>) {
    if (!personasCollectionRef || !user) {
        toast({ variant: 'destructive', title: 'エラー', description: 'ユーザー認証に問題があります。'})
        return
    }

    addDocumentNonBlocking(personasCollectionRef, {
      ...data,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    toast({ title: '成功', description: '新しいペルソナ（キャラクター）を保存しました。' })
    form.reset()
    setAiTopic('')
  }

  function handleDelete(personaId: string) {
    if (!user) return
    const docRef = doc(firestore, 'users', user.uid, 'personas', personaId)
    deleteDocumentNonBlocking(docRef)
    toast({ title: '成功', description: 'ペルソナを削除しました。'})
  }

  return (
    <div className="space-y-10">
      {/* AI Generate Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AIにおまかせで作成
          </CardTitle>
          <CardDescription>
            発信したいトピックやジャンルを入力するだけで、最適なペルソナ設定をAIが提案します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              placeholder="例: '北欧インテリアのアフィリエイト投稿', '30代サラリーマン向けの家計管理'" 
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              className="flex-1"
            />
            <Button 
                onClick={handleAiGenerate} 
                disabled={isAiGenerating || !aiTopic}
                className="shrink-0"
            >
              {isAiGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              AIで自動設定
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Form */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-border/50">
            <CardHeader>
              <CardTitle className="text-xl">新しいペルソナの作成</CardTitle>
              <CardDescription>
                コンテンツの「声」となるキャラクター像を細かく設定します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                      <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                              <FormItem>
                                <FormLabel>ペルソナ名</FormLabel>
                                <FormControl>
                                    <Input placeholder="例: 節約ママのちえさん" {...field} />
                                </FormControl>
                                <FormDescription className="text-[10px]">
                                    リストで判別しやすい名前（ハンドルネーム等）を付けてください。
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                          )}
                      />
                       <FormField
                          control={form.control}
                          name="targetAudience"
                          render={({ field }) => (
                              <FormItem>
                                <FormLabel>ターゲット層</FormLabel>
                                <FormControl>
                                    <Input placeholder="例: 共働きの主婦、20代の一人暮らし" {...field} />
                                </FormControl>
                                <FormDescription className="text-[10px]">
                                    このキャラクターが誰に向けて発信するかを定義します。年齢、職業、ライフスタイルなど。
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="tone"
                          render={({ field }) => (
                              <FormItem>
                                <FormLabel>コンテンツのトーン</FormLabel>
                                <FormControl>
                                    <Input placeholder="例: 親しみやすく丁寧な敬語, 専門用語を含むカジュアルな口調" {...field} />
                                </FormControl>
                                <FormDescription className="text-[10px]">
                                    AIが文章を書く際の口調のルールです。敬語・タメ口・特定の言い回し（「〜だよ」等）を指定できます。
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                          )}
                          />
                      <FormField
                          control={form.control}
                          name="imageStyle"
                          render={({ field }) => (
                              <FormItem>
                                <FormLabel>画像のスタイル</FormLabel>
                                <FormControl>
                                    <Input placeholder="例: 写実的で明るい雰囲気, 手書き風の温かいイラスト" {...field} />
                                </FormControl>
                                <FormDescription className="text-[10px]">
                                    Pinterestやブログで生成される商品背景画像の「質感」を指定します。
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                          )}
                          />
                      <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                              <FormItem>
                                <FormLabel>詳しいプロフィール（任意）</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="家族構成、悩み事、興味があるジャンルなど..." {...field} />
                                </FormControl>
                                <FormDescription className="text-[10px]">
                                    より人間味のある投稿にするために、詳しい設定を書き込めます。
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                          )}
                          />
                      <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={form.formState.isSubmitting}>
                          {form.formState.isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                          ペルソナを確定して保存
                      </Button>
                  </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold text-foreground px-1">運用中のペルソナ</h3>
            {isLoadingPersonas ? (
                 <div className="flex flex-col items-center justify-center p-20 rounded-xl bg-card/40 border border-dashed border-border/60">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                    <p className="mt-4 text-muted-foreground animate-pulse">ペルソナ情報を取得中...</p>
                </div>
            ) : personas && personas.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {personas.map((persona) => (
                        <Card key={persona.id} className="relative overflow-hidden group border-border/40 hover:border-primary/30 transition-all duration-300">
                            <CardHeader className="pb-3 border-b border-border/20 bg-muted/20">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">{persona.name}</CardTitle>
                                        <CardDescription className="text-primary font-medium">{persona.targetAudience}</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors" onClick={() => handleDelete(persona.id)}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">削除</span>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-5 space-y-4 text-sm leading-relaxed">
                                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                                  <p className="text-muted-foreground"><strong className="font-semibold text-foreground mr-2">性格・口調:</strong>{persona.tone}</p>
                                </div>
                                <div className="p-3 bg-muted/10 rounded-lg">
                                  <p className="text-muted-foreground"><strong className="font-semibold text-foreground mr-2">画像スタイル:</strong>{persona.imageStyle}</p>
                                </div>
                                {persona.description && (
                                  <div className="pt-4 mt-2 border-t border-dotted">
                                     <p className="text-foreground/80 line-clamp-3 text-xs leading-5">
                                        {persona.description}
                                     </p>
                                  </div>
                                )}
                            </CardContent>
                            <CardFooter className="bg-muted/5 py-3 text-[10px] text-muted-foreground">
                                更新日: {persona.updatedAt?.toDate?.()?.toLocaleDateString() || '2024/01/01'}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-20 rounded-2xl border-2 border-dashed border-muted bg-muted/10">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-6">
                      <PlusCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium text-foreground">表示できるペルソナがありません</p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs text-center">左のフォームかAI自動生成から、発信スタイルのベースとなるキャラクターを作成してください。</p>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}
