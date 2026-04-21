'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, PenSquare, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { collection, doc } from 'firebase/firestore'

import {
  generateSocialMediaPost,
  type GenerateSocialMediaPostOutput,
} from '@/ai/flows/generate-social-media-post'
import {
  generateBlogPost,
  type GenerateBlogPostOutput,
} from '@/ai/flows/generate-blog-post'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import PostPreview from './post-preview'
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase'
import Link from 'next/link'
import { type RakutenProduct } from '@/ai/flows/search-rakuten-products'
import BlogPostView from './blog-post-view'

const formSchema = z.object({
  topic: z.string().min(10, {
    message: 'トピックは10文字以上で入力してください。',
  }),
  persona: z.string({
    required_error: 'ペルソナを選択してください。',
  }),
})

interface PostGeneratorProps {
  selectedProduct: RakutenProduct | null;
  slotId?: number;
}

export default function PostGenerator({ selectedProduct, slotId = 1 }: PostGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [generatedPost, setGeneratedPost] =
    useState<GenerateSocialMediaPostOutput | null>(null)
  const [generatedBlog, setGeneratedBlog] =
    useState<GenerateBlogPostOutput | null>(null)
  const { toast } = useToast()
  const { user } = useUser()
  const firestore = useFirestore()

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(firestore, 'users', user.uid)
  }, [firestore, user])
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef)

  const [generationPayload, setGenerationPayload] = useState<{
    topic: string;
    persona: any;
    product: RakutenProduct | null;
  } | null>(null);

  const personasCollectionRef = useMemoFirebase(() => {
    if (!user) return null
    return collection(firestore, 'users', user.uid, 'personas')
  }, [firestore, user])

  const { data: personas, isLoading: isLoadingPersonas } = useCollection(personasCollectionRef)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
    },
  })

  // ペルソナの選択を監視して保存
  const selectedPersona = form.watch('persona');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const suffix = slotId > 1 ? `_slot_${slotId}` : '';
    const savedPersona = localStorage.getItem(`mizuiro_selected_persona${suffix}`);
    if (savedPersona) {
      form.setValue('persona', savedPersona);
    } else {
      form.setValue('persona', '');
    }
  }, [slotId, form]);

  useEffect(() => {
    if (typeof window === 'undefined' || !selectedPersona) return;
    const suffix = slotId > 1 ? `_slot_${slotId}` : '';
    localStorage.setItem(`mizuiro_selected_persona${suffix}`, selectedPersona);
  }, [selectedPersona, slotId]);

  // タブ移動やスロット切り替え時に生成結果を復元
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const suffix = slotId > 1 ? `_slot_${slotId}` : '';
      const savedBlog = localStorage.getItem(`mizuiro_generated_blog${suffix}`);
      const savedPost = localStorage.getItem(`mizuiro_generated_post${suffix}`);
      const savedPayload = localStorage.getItem(`mizuiro_generation_payload${suffix}`);
      
      setGeneratedBlog(savedBlog ? JSON.parse(savedBlog) : null);
      setGeneratedPost(savedPost ? JSON.parse(savedPost) : null);
      setGenerationPayload(savedPayload ? JSON.parse(savedPayload) : null);
    } catch (e) {
      console.error('Failed to restore slot content', e);
    }
  }, [slotId]);

  // 生成結果が変わったらlocalStorageに保存する
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const suffix = slotId > 1 ? `_slot_${slotId}` : '';
    
    if (generatedBlog) {
      localStorage.setItem(`mizuiro_generated_blog${suffix}`, JSON.stringify(generatedBlog));
    }
    if (generatedPost) {
      localStorage.setItem(`mizuiro_generated_post${suffix}`, JSON.stringify(generatedPost));
    }
    if (generationPayload) {
      localStorage.setItem(`mizuiro_generation_payload${suffix}`, JSON.stringify(generationPayload));
    }
  }, [generatedBlog, generatedPost, generationPayload, slotId]);
  
  useEffect(() => {
    if (selectedProduct) {
      form.setValue('topic', selectedProduct.itemName)
    }
  }, [selectedProduct, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
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
      });
      return;
    }

    if (!selectedProduct) {
      toast({
        variant: 'destructive',
        title: '商品が選択されていません',
        description: '上部の「楽天商品検索」から、投稿の対象となる商品を選んでください。',
      });
      return;
    }

    setIsLoading(true)
    setGeneratedPost(null)
    setGeneratedBlog(null)
    setGenerationPayload(null)
    try {
      const personaObject = JSON.parse(values.persona)
      
      // 記事とSNSテキストを1度のAI呼び出しで全て生成
      const blogResult = await generateBlogPost({
        product: selectedProduct!,
        persona: personaObject,
        googleApiKey: userData.googleApiKey,
      })
      setGeneratedBlog(blogResult)

      setGenerationPayload({
        topic: values.topic,
        persona: personaObject,
        product: selectedProduct,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'エラーが発生しました。',
        description: error.message || 'コンテンツの生成に失敗しました。',
      })
      console.error('Failed to generate content', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderContent = () => {
    if (isUserDataLoading || isLoadingPersonas) {
        return (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">ユーザー情報を読み込み中...</p>
            </div>
        )
    }
    if (!userData?.googleApiKey) {
        return (
            <div className="text-center text-sm text-muted-foreground py-8 rounded-lg border-2 border-dashed">
                <p>AI機能を利用するには、まずGoogle APIキーを設定する必要があります。</p>
                <Button variant="link" asChild>
                  <Link href="/dashboard/settings?tab=integrations">設定ページに移動してキーを設定する</Link>
                </Button>
            </div>
        )
    }
    if (!personas || personas.length === 0) {
        return (
             <div className="text-center text-sm text-muted-foreground py-8 rounded-lg border-2 border-dashed">
                <p>投稿を生成する前に、まずペルソナを作成する必要があります。</p>
                <Button variant="link" asChild>
                  <Link href="/dashboard/settings?tab=personas">設定ページに移動してペルソナを作成する</Link>
                </Button>
            </div>
          )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>トピック</FormLabel>
                    <FormControl>
                        <Input
                        placeholder="例: '春におすすめの日本の旅行先トップ5'"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="persona"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>ペルソナ</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="ペルソナを選択してください" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {personas.map(p => (
                            <SelectItem key={p.id} value={JSON.stringify({
                            id: p.id,
                            name: p.name,
                            tone: p.tone,
                            imageStyle: p.imageStyle,
                            targetAudience: p.targetAudience
                            })}>
                            {p.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                <Sparkles className="mr-2 h-4 w-4" />
                )}
                投稿を生成
            </Button>
            </form>
        </Form>
    )
  }

  return (
    <div className="flex flex-col gap-8" id="post-generator">
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenSquare className="h-6 w-6" /> AI投稿ジェネレーター
          </CardTitle>
          <CardDescription>
            トピックとペルソナから魅力的なSNS投稿を作成します。商品を選択すると、トピックが自動入力されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
      </Card>
      {isLoading && (
         <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
           <CardContent className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            <p className="ml-4 text-muted-foreground">AIがコンテンツを生成中...</p>
           </CardContent>
         </Card>
      )}
      {generatedBlog && generationPayload && (
        <BlogPostView 
          blog={generatedBlog}
          product={generationPayload.product!}
          persona={generationPayload.persona}
          userData={userData}
          slotId={slotId}
        />
      )}
    </div>
  )
}
