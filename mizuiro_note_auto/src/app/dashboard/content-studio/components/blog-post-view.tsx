'use client'

import { useState, useMemo, useEffect } from 'react'
import { marked } from 'marked'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { 
  Check, 
  Clipboard, 
  FileText, 
  Globe, 
  Save, 
  Loader2,
  ExternalLink,
  Send,
  Share2,
  Pin,
  ShoppingBag
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { type GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post'
import { type RakutenProduct } from '@/ai/flows/search-rakuten-products'
// Blogger投稿は /api/blogger-post APIルート経由で実行
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { logActivity } from '@/lib/activity-logger'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BlogPreview from './previews/blog-preview'
import PinterestPreview from './previews/pinterest-preview'
import ThreadsPreview from './previews/threads-preview'
import { Eye, Edit3 } from 'lucide-react'

interface BlogPostViewProps {
  blog: GenerateBlogPostOutput;
  product: RakutenProduct;
  persona: any;
  userData: any;
  slotId?: number;
}

export default function BlogPostView({ blog, product, persona, userData, slotId = 1 }: BlogPostViewProps) {
  const { user } = useUser()
  const { toast } = useToast()
  const firestore = useFirestore()
  
  // スロット別の連携プロファイルを取得
  const studioProfileRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(firestore, 'users', user.uid, 'studioProfiles', slotId.toString())
  }, [firestore, user, slotId])
  const { data: profileData } = useDoc(studioProfileRef)

  const [isPosting, setIsPosting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [title, setTitle] = useState(blog.title)
  const [content, setContent] = useState(blog.content)
  const [isPreviewMode, setIsPreviewMode] = useState(true)

  // 記事の内容と画像を合成してプロ仕様の構成にする
  useEffect(() => {
    // 不要な画像を除去するフィルター
    const filteredImages = product.mediumImageUrls?.filter(url => {
      const lowerUrl = url.toLowerCase();
      // index, banner, parts, icon などの文字列が含まれるものを除外
      return !lowerUrl.includes('index') && 
             !lowerUrl.includes('banner') && 
             !lowerUrl.includes('parts') && 
             !lowerUrl.includes('icon') &&
             !lowerUrl.includes('logo');
    }) || [];

    const mainImage = product.imageUrl || filteredImages[0] || product.mediumImageUrls?.[0] || '';
    const subImages = filteredImages.slice(0, 3); // 最大3枚の追加画像（トップ画像として採用されなかったものを含む）

    // 記事の構成
    let enhancedContent = '';
    
    // 1. トップ画像
    if (mainImage) {
      enhancedContent += `![${product.itemName}](${mainImage})\n\n`;
    }

    // 2. 本文
    enhancedContent += blog.content;

    // 3. 追加画像（ギャラリー的に配置）
    if (subImages.length > 0) {
      enhancedContent += `\n\n### ギャラリー・詳細イメージ\n\n`;
      subImages.forEach((img, idx) => {
        enhancedContent += `![詳細イメージ ${idx + 1}](${img}) `;
      });
    }

    // 4. 楽天リンク（ここでは付与せず、HTML生成時にのみ付与します）
    // enhancedContent += \`\\n\\n---\\n\\n### 今回紹介した商品はこちら\\n\\n[▶ **\${product.itemName}** を楽天で詳しく見る](\${product.itemUrl})\`;
    
    setTitle(blog.title);
    setContent(enhancedContent);
    sessionStorage.setItem('mizuiro_current_title', blog.title);
    sessionStorage.setItem('mizuiro_current_content', enhancedContent);
  }, [blog, product]);

  // 編集内容をSessionStorageに同期
  useEffect(() => {
    sessionStorage.setItem('mizuiro_current_title', title)
    sessionStorage.setItem('mizuiro_current_content', content)
  }, [title, content])
  
  // 投稿先プラットフォームの選択状態
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    blogger: true,
    threads: false,
    pinterest: false,
    wordpress: false,
    hatena: false,
    rakutenRoom: false
  })

  useEffect(() => {
    const saved = localStorage.getItem(`mizuiro_platforms_slot_${slotId}`);
    if (saved) {
      try {
        setSelectedPlatforms(JSON.parse(saved));
      } catch(e) {}
    }
  }, [slotId]);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => {
      const next = { ...prev, [id]: !prev[id as keyof typeof prev] };
      localStorage.setItem(`mizuiro_platforms_slot_${slotId}`, JSON.stringify(next));
      return next;
    });
  }

  const handleCopy = () => {
    const fullText = `# ${title}\n\n${content}`
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: 'ブログ記事をコピーしました' })
  }

  const handlePublishAll = async () => {
    const activePlatforms = Object.entries(selectedPlatforms)
      .filter(([_, selected]) => selected)
      .map(([id]) => id);

    if (activePlatforms.length === 0) {
      toast({ title: '投稿先を選択してください', variant: 'destructive' })
      return
    }

    setIsPosting(true)
    let successCount = 0
    let failCount = 0
    const errors: string[] = [];

    // 手動投稿系（クリップボード必須なので非同期処理の前に実行）
    if (activePlatforms.includes('rakutenRoom')) {
      const roomText = `${blog.snsRakutenRoom || 'おすすめ商品です。'}\n\n詳細はこちら👇\n${product.itemUrl}`;
      try {
        await navigator.clipboard.writeText(roomText);
        toast({
          title: '楽天Room用テキストをコピーしました',
          description: 'この後開く楽天Roomアプリ等で商品URLを貼り付けて投稿してください。',
          duration: 10000,
        });
        window.open('https://room.rakuten.co.jp/', '_blank');
        successCount++;
        await logActivity({ ...logBase, platform: 'rakutenRoom', status: 'success' });
      } catch (err: any) {
        toast({ title: 'クリップボードへのコピーに失敗しました', variant: 'destructive' });
      }
    }

    // HTMLコンテンツの生成
    const generateHtml = () => {
      // markedの同期実行
      let html = marked.parse(content, { breaks: true, gfm: true }) as string;
      const isNoticeImage = (url: string) => {
        const lowerUrl = url.toLowerCase();
        return lowerUrl.includes('caution') || lowerUrl.includes('info') || lowerUrl.includes('guide') || lowerUrl.includes('attention') || lowerUrl.includes('not_found');
      }

      if (product.allImages && product.allImages.length > 0) {
        const validImages = product.allImages.filter(url => !isNoticeImage(url));
        const displayImages = validImages.slice(1, 4);
        const imageTags = displayImages.map(url => 
          `<div style="text-align: center; margin: 20px 0;">
            <img src="${url}" alt="${product.itemName}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
          </div>`
        );
        const paragraphs = html.split('</p>');
        if (paragraphs.length > 5) {
          if (imageTags[0]) paragraphs.splice(Math.floor(paragraphs.length * 0.3), 0, imageTags[0]);
          if (imageTags[1]) paragraphs.splice(Math.floor(paragraphs.length * 0.7), 0, imageTags[1]);
          html = paragraphs.join('</p>');
        } else {
          html += imageTags.join('');
        }
      }
      
      html += `
<div style="margin-top: 40px; padding: 20px; border: 2px solid #f3f4f6; border-radius: 12px; text-align: center; background-color: #f9fafb;">
<h3 style="margin-bottom: 15px;">紹介した商品はこちら</h3>
<p style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">${product.itemName}</p>
<a href="${product.itemUrl}" style="display: inline-block; background-color: #bfdbfe; color: #1e3a8a; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; border: 1px solid #3b82f6;">
今すぐ詳細をチェック！
</a>
</div>`;
      return html;
    };

    const htmlContent = generateHtml();
    const logBase = {
      userId: user?.uid || 'unknown',
      productName: product.itemName,
      itemPrice: product.itemPrice,
      itemUrl: product.itemUrl,
      imageUrl: product.allImages?.find(url => !url.toLowerCase().includes('caution')) || product.imageUrl,
      postTitle: title,
      postContent: content
    };

    let detectedBlogUrl = '';

    // 1. ブログ投稿 (先行実行: WordPress -> Blogger -> Hatena)
    const blogPlatforms = ['wordpress', 'blogger', 'hatena'];
    const snsPlatforms = ['threads', 'pinterest'];
    
    // ブログ投稿フェーズ
    for (const platformId of activePlatforms.filter(p => blogPlatforms.includes(p))) {
      try {
        // プロファイルデータを優先、なければuserData (フォールバック)
        const currentData = profileData || userData;

        if (platformId === 'wordpress') {
          const { wordpressUrl, wordpressUsername, wordpressAppPassword } = currentData || {};
          if (wordpressUrl && wordpressUsername && wordpressAppPassword) {
            const res = await fetch('/api/wordpress-post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ siteUrl: wordpressUrl, username: wordpressUsername, appPassword: wordpressAppPassword, title, content: htmlContent })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'WordPress APIエラー');
            detectedBlogUrl = detectedBlogUrl || result.url;
            successCount++;
            await logActivity({ ...logBase, platform: 'wordpress', status: 'success' });
          } else {
            throw new Error('WordPress設定不足');
          }
        } else if (platformId === 'blogger') {
          // アクセストークンの取得 (profileData → userData の順でフォールバック)
          const accessToken = currentData?.integrations?.blogger?.accessToken 
            || currentData?.bloggerAccessToken
            || userData?.integrations?.blogger?.accessToken
            || userData?.bloggerAccessToken;
          // リフレッシュトークンも同様にフォールバック
          const refreshToken = currentData?.integrations?.blogger?.refreshToken
            || userData?.integrations?.blogger?.refreshToken;
          const emailTo = currentData?.bloggerEmail || userData?.bloggerEmail;
          
          if (accessToken) {
            // APIルートを使って投稿（リフレッシュもサーバー側で自動処理）
            const res = await fetch('/api/blogger-post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken, refreshToken, title, content: htmlContent })
            });
            const result = await res.json();
            
            if (!res.ok) {
              throw new Error(result.error || 'Bloggerへの投稿に失敗しました。');
            }
            
            detectedBlogUrl = detectedBlogUrl || result.url;
            successCount++;
            
            // トークンがリフレッシュされた場合、Firestoreを更新
            if (result.refreshed && result.newAccessToken && user && firestore) {
              try {
                const slotRef = doc(firestore, 'users', user.uid, 'studioProfiles', slotId.toString());
                const userRef = doc(firestore, 'users', user.uid);
                await setDoc(slotRef, {
                  integrations: { blogger: { accessToken: result.newAccessToken, refreshToken, isConnected: true } },
                  bloggerAccessToken: result.newAccessToken
                }, { merge: true });
                await setDoc(userRef, {
                  integrations: { blogger: { accessToken: result.newAccessToken, refreshToken, isConnected: true } }
                }, { merge: true });
                console.log('Bloggerトークンを自動更新・保存しました。');
              } catch (firestoreErr) {
                console.warn('Firestoreへのトークン保存に失敗しましたが、投稿自体は成功しています。', firestoreErr);
              }
            }
            
            await logActivity({ ...logBase, platform: 'blogger', status: 'success' });
          } else if (emailTo) {
            const res = await fetch('/api/blogger-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: emailTo, title, content: htmlContent })
            });
            if (!res.ok) throw new Error('Bloggerメール送信失敗');
            successCount++;
            await logActivity({ ...logBase, platform: 'blogger', status: 'success' });
          } else {
            throw new Error('BloggerのAPI連携またはメール設定が必要です。');
          }
        } else if (platformId === 'hatena') {
          const { hatenaId, hatenaBlogId, hatenaApiKey } = currentData || {};
          if (hatenaId && hatenaBlogId && hatenaApiKey) {
            const res = await fetch('/api/hatena-post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ hatenaId, blogId: hatenaBlogId, apiKey: hatenaApiKey, title, content: htmlContent })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'はてなブログAPIエラー');
            detectedBlogUrl = detectedBlogUrl || result.url;
            successCount++;
            await logActivity({ ...logBase, platform: 'hatena', status: 'success' });
          } else {
            throw new Error('はてなブログ設定不足');
          }
        }
      } catch (e: any) {
        failCount++;
        let errorMessage = e instanceof Error ? e.message : String(e);
        
        // Bloggerのエラーメッセージはサーバー側APIで既に適切にフォーマット済み

        errors.push(`${platformId.toUpperCase()}: ${errorMessage}`);
        toast({ 
          title: `${platformId}投稿失敗`, 
          description: errorMessage, 
          variant: 'destructive',
          duration: 12000 
        });
      }
    }

    // 2. SNS投稿フェーズ (SNSは最後に投稿し、成功したブログURLを貼る)
    for (const platformId of activePlatforms.filter(p => snsPlatforms.includes(p))) {
      try {
        const currentData = profileData || userData;

        if (platformId === 'threads') {
          const token = currentData?.threadsAccessToken || currentData?.integrations?.threads?.accessToken;
          if (token) {
            const bestImage = product.allImages?.find(url => !url.toLowerCase().includes('caution')) || product.imageUrl;
            console.log('Posting to Threads with link:', detectedBlogUrl || product.itemUrl);
            const res = await fetch('/api/threads-post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                accessToken: token, 
                text: blog.snsThreads || 'おすすめ商品を紹介します！', 
                imageUrl: bestImage, 
                link: detectedBlogUrl || product.itemUrl // 成功したブログ記事があればそれを貼る、なければ楽天リンク
              })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Threads投稿失敗');
            successCount++;
            await logActivity({ ...logBase, platform: 'threads', status: 'success' });
          } else {
            throw new Error('Threads連携未完了');
          }
        } else if (platformId === 'pinterest') {

          const token = currentData?.pinterestAccessToken || currentData?.integrations?.pinterest?.accessToken;
          if (token) {
            const res = await fetch('/api/pinterest-post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accessToken: token,
                title: title, // 編集されたタイトルを使用
                description: blog.snsPinterest || content.substring(0, 500),
                link: detectedBlogUrl || product.itemUrl,
                imageUrl: product.imageUrl,
                boardId: currentData?.pinterestBoardId
              })
            });
            if (!res.ok) throw new Error('Pinterest投稿失敗');
            successCount++;
            await logActivity({ ...logBase, platform: 'pinterest', status: 'success' });
          } else {
            throw new Error('Pinterest連携未完了');
          }
        }
      } catch (e: any) {
        failCount++;
        errors.push(`${platformId.toUpperCase()}: ${e.message}`);
        toast({ title: `${platformId}投稿失敗`, description: e.message, variant: 'destructive' });
      }
    }

    // 最終報告
    if (successCount > 0) {
      toast({
        variant: 'success',
        title: `一括投稿が完了しました！ 🎉`,
        description: failCount > 0 
          ? `${successCount}件成功しましたが、${failCount}件失敗しました。通知をご確認ください。` 
          : `${successCount}件すべての媒体に公開されました！`,
      })
    } else if (failCount > 0) {
      toast({ title: '全媒体への投稿に失敗しました', variant: 'destructive' })
    }
    
    setIsPosting(false)
  }

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isPreviewMode ? 'コンテンツのプレビュー' : '生成されたブログ記事'}
            </CardTitle>
            <CardDescription>
              {isPreviewMode 
                ? '各プラットフォームでの実際の見え方を確認しましょう。' 
                : '楽天商品の情報を元にAIが構成したブログ用コンテンツです。'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={isPreviewMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="gap-2"
            >
              {isPreviewMode ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isPreviewMode ? '編集に戻る' : 'プレビューを表示'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Clipboard className="h-4 w-4 mr-2" />}
              {copied ? 'コピー済み' : '全文コピー'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {isPreviewMode ? (
          <Tabs defaultValue="blog" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/30">
              <TabsTrigger value="blog" className="gap-2">
                <Globe className="h-4 w-4" /> ブログ
              </TabsTrigger>
              <TabsTrigger value="pinterest" className="gap-2">
                <Pin className="h-4 w-4 text-red-600" /> Pinterest
              </TabsTrigger>
              <TabsTrigger value="threads" className="gap-2">
                <Share2 className="h-4 w-4 text-primary" /> Threads
              </TabsTrigger>
            </TabsList>

            <TabsContent value="blog" className="min-h-[400px] border border-border/40 rounded-xl p-8 bg-white/40">
              <BlogPreview title={title} content={content} />
            </TabsContent>

            <TabsContent value="pinterest" className="min-h-[400px] border border-border/40 rounded-xl p-8 bg-white/40">
              <PinterestPreview 
                imageUrl={product.imageUrl} 
                title={title} 
                description={blog.snsPinterest} 
              />
            </TabsContent>

            <TabsContent value="threads" className="min-h-[400px] border border-border/40 rounded-xl p-8 bg-white/40">
              <ThreadsPreview 
                text={blog.snsThreads} 
                imageUrl={product.imageUrl} 
              />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {/* タイトル編集 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">記事タイトル</label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="text-lg font-bold bg-background/50 transition-all focus:bg-background h-12"
              />
            </div>

            {/* 本文編集 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">本文 (Markdown形式)</label>
              <Textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] font-mono leading-relaxed bg-background/50 p-4 transition-all focus:bg-background"
              />
            </div>
          </>
        )}

        {/* 一括投稿セクション */}
        <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-primary/5 shadow-inner">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">同時投稿の詳細</span>
          </div>
          
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2 bg-white/50 p-2 rounded-lg pr-4">
              <Checkbox id="blogger" checked={selectedPlatforms.blogger} onCheckedChange={() => togglePlatform('blogger')} />
              <Label htmlFor="blogger" className="text-sm cursor-pointer flex items-center gap-1">
                Blogger <Badge variant={(userData?.integrations?.blogger?.isConnected || userData?.bloggerEmail) ? "success" : "outline"} className="scale-75 origin-left">{(userData?.integrations?.blogger?.isConnected || userData?.bloggerEmail) ? 'Connected' : 'Link'}</Badge>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 bg-white/50 p-2 rounded-lg pr-4">
              <Checkbox id="threads" checked={selectedPlatforms.threads} onCheckedChange={() => togglePlatform('threads')} />
              <Label htmlFor="threads" className="text-sm cursor-pointer flex items-center gap-1">
                Threads <Badge variant={userData?.threadsAccessToken ? "success" : "outline"} className="scale-75 origin-left">{userData?.threadsAccessToken ? 'Linked' : 'Link'}</Badge>
              </Label>
            </div>

            <div className="flex items-center space-x-2 bg-white/50 p-2 rounded-lg pr-4">
              <Checkbox id="pinterest" checked={selectedPlatforms.pinterest} onCheckedChange={() => togglePlatform('pinterest')} />
              <Label htmlFor="pinterest" className="text-sm cursor-pointer flex items-center gap-1">
                Pinterest <Badge variant="secondary" className="scale-75 origin-left opacity-70">Trial</Badge>
              </Label>
            </div>

            <div className="flex items-center space-x-2 bg-white/50 p-2 rounded-lg pr-4">
              <Checkbox id="wordpress" checked={selectedPlatforms.wordpress} onCheckedChange={() => togglePlatform('wordpress')} />
              <Label htmlFor="wordpress" className="text-sm cursor-pointer flex items-center gap-1">
                WordPress <Badge variant={userData?.wordpressUrl && userData?.wordpressAppPassword ? "success" : "outline"} className="scale-75 origin-left">{userData?.wordpressUrl && userData?.wordpressAppPassword ? 'Linked' : 'Setup'}</Badge>
              </Label>
            </div>

            <div className="flex items-center space-x-2 bg-white/50 p-2 rounded-lg pr-4">
              <Checkbox id="hatena" checked={selectedPlatforms.hatena} onCheckedChange={() => togglePlatform('hatena')} />
              <Label htmlFor="hatena" className="text-sm cursor-pointer flex items-center gap-1">
                はてな <Badge variant={((profileData || userData)?.hatenaId && (profileData || userData)?.hatenaApiKey) || (profileData || userData)?.hatenaEmail ? "success" : "outline"} className="scale-75 origin-left">{((profileData || userData)?.hatenaId && (profileData || userData)?.hatenaApiKey) || (profileData || userData)?.hatenaEmail ? 'Linked' : 'Setup'}</Badge>
              </Label>
            </div>

            <div className="flex items-center space-x-2 bg-white/50 p-2 rounded-lg pr-4">
              <Checkbox id="rakutenRoom" checked={selectedPlatforms.rakutenRoom} onCheckedChange={() => togglePlatform('rakutenRoom')} />
              <Label htmlFor="rakutenRoom" className="text-sm cursor-pointer flex items-center gap-1">
                楽天Room <Badge variant="secondary" className="scale-75 origin-left opacity-70 border-pink-200 bg-pink-50 text-pink-700">半自動(コピー)</Badge>
              </Label>
            </div>
          </div>

          <Button 
            className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
            onClick={handlePublishAll}
            disabled={isPosting}
          >
            {isPosting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
            選択した媒体に一括公開
          </Button>
        </div>

        {/* サポートアクション */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" className="border-primary/20 hover:bg-primary/5 text-primary">
            <Save className="mr-2 h-4 w-4" /> 下書きとしてローカル保存
          </Button>
          <Button variant="ghost" asChild>
            <a href={product.itemUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
              <ExternalLink className="mr-2 h-4 w-4" /> 楽天の商品ページ
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
