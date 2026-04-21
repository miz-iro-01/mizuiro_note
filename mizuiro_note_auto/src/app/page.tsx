import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { 
  ArrowRight, 
  Search, 
  PenTool, 
  Share2, 
  Zap, 
  BarChart3, 
  ShieldCheck 
} from 'lucide-react';

export default function RootPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
      {/* ナビゲーション */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Logo className="text-2xl" />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="transition-colors hover:text-primary">機能</Link>
            <Link href="#how-it-works" className="transition-colors hover:text-primary">使い方</Link>
            <Link href="#benefits" className="transition-colors hover:text-primary">メリット</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/login">ログイン</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-100">
              <Link href="/signup">無料で始める</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ヒーローセクション */}
        <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-48">
          {/* 背景の装飾 */}
          <div className="absolute top-0 left-1/2 -z-10 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/10 via-background to-background blur-3xl opacity-50" />
          
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <Zap className="mr-2 h-4 w-4 fill-primary" />
              <span>AIでアフィリエイトを自動化</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl mb-8 bg-gradient-to-br from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              楽天商品から、<br className="sm:block hidden" />
              <span className="text-primary italic">一瞬</span>でブログとSNSへ。
            </h1>
            <p className="mx-auto max-w-[700px] text-lg text-muted-foreground mb-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
              -MIZUIRO- は、楽天アフィリエイトの商品リサーチ、ブログ記事の生成、<br className="sm:block hidden" />
              そしてPinterestやThreadsへの投稿をAIで完全にサポートするオールインワンツールです。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
              <Button size="lg" asChild className="h-14 px-10 text-lg shadow-xl shadow-primary/20 ring-1 ring-primary/50 transition-all hover:scale-105">
                <Link href="/signup">今すぐ無料で開始 <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-14 px-10 text-lg backdrop-blur-sm border-border/50 hover:bg-background/50 transition-all">
                <Link href="#features">機能を見る</Link>
              </Button>
            </div>
            
            {/* プレビュー画像（プレースホルダ） */}
            <div className="mt-20 relative animate-in zoom-in duration-1000 delay-700">
              <div className="mx-auto max-w-4xl rounded-2xl border border-border/50 bg-card/30 p-2 shadow-2xl backdrop-blur-sm">
                <div className="rounded-xl border border-border/50 bg-background overflow-hidden aspect-video flex items-center justify-center text-muted-foreground">
                  {/* ここに実際のダッシュボードプレビュー動画や画像を配置予定 */}
                  <div className="flex flex-col items-center gap-4">
                    <BarChart3 className="h-16 w-16 opacity-20" />
                    <p className="font-medium text-xl">Dashboard Preview</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 sm:bottom-12 sm:-left-12 p-6 rounded-2xl bg-card border border-border shadow-xl hidden sm:block animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">生成完了</p>
                    <p className="text-[10px] text-muted-foreground">ブログ記事 + SNS投稿</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 機能紹介 */}
        <section id="features" className="py-24 bg-card/30 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold sm:text-4xl mb-4">アフィリエイトの時間を短縮する</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                手作業で行っていたリサーチや執筆をAIが代行。あなたは戦略を練ることに集中できます。
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Search className="h-6 w-6 text-sky-500" />}
                title="楽天商品リサーチ"
                description="キーワード一つで、トレンドに合った楽天アフィリエイト商品を瞬時に抽出。単価や人気度も一目で把握。"
                delay={0}
              />
              <FeatureCard 
                icon={<PenTool className="h-6 w-6 text-purple-500" />}
                title="AIブログ記事生成"
                description="選択した商品を元に、SEOに最適化された高品質な記事を生成。Blogger、WordPress、はてなブログに対応。"
                delay={200}
              />
              <FeatureCard 
                icon={<Share2 className="h-6 w-6 text-rose-500" />}
                title="SNSマルチポスト"
                description="ブログ記事から自動的にPinterestやThreads向けの投稿を作成。画像もAIがプロンプトから生成。"
                delay={400}
              />
            </div>
          </div>
        </section>

        {/* メリット */}
        <section id="benefits" className="py-24 border-t border-border/40">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 space-y-8">
                <h2 className="text-4xl font-bold leading-tight">初心者でも今日から<br />プロのクオリティで。</h2>
                <div className="space-y-6">
                  <BenefitItem 
                    icon={<Zap className="h-5 w-5" />}
                    title="圧倒的なスピード"
                    description="1記事と数通りのSNS投稿を作るのに、これまでは数時間かかっていました。-MIZUIRO-なら数分です。"
                  />
                  <BenefitItem 
                    icon={<ShieldCheck className="h-5 w-5" />}
                    title="誰でも使いこなせる"
                    description="複雑なAPI設定は不要。OAuth認証でボタン一つで各プラットフォームと連携できます。"
                  />
                  <BenefitItem 
                    icon={<BarChart3 className="h-5 w-5" />}
                    title="分析と改善"
                    description="どの投稿がクリックされたか、どの商品が売れたかをダッシュボードで視覚化予定。"
                  />
                </div>
              </div>
              <div className="lg:w-1/2 relative">
                <div className="relative z-10 rounded-2xl border border-border/50 overflow-hidden shadow-2xl skew-y-3 grayscale hover:grayscale-0 transition-all duration-700">
                  <div className="bg-gradient-to-br from-primary to-sky-600 h-96 flex items-center justify-center p-12">
                    <p className="text-4xl font-bold text-white text-center italic opacity-80 select-none">MIZUIRO Magic</p>
                  </div>
                </div>
                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/20 blur-[100px] rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 border-t border-border/40 bg-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">アフィリエイトの未来を体験しよう</h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              今すぐ登録して、-MIZUIRO- の自動化体験を始めてください。
            </p>
            <Button size="lg" asChild className="h-16 px-12 text-xl shadow-2xl shadow-primary/20 transition-all hover:scale-105">
              <Link href="/signup">「無料で始める」で体験を開始する</Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">※ クレジットカード登録後、7日間の無料トライアルが開始されます。8日目よりスタンダードプラン（月額3,980円）へ自動移行します。</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4">
            <Logo className="text-xl" />
            <p className="text-sm text-muted-foreground">© 2026 -MIZUIRO-. All rights reserved.</p>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground font-medium">
            <Link href="#" className="hover:text-primary transition-colors">利用規約</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">プライバシーポリシー</Link>
            <Link href="#" className="hover:text-primary transition-colors">お問い合わせ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <div 
      className="p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-card hover:-translate-y-2 duration-300"
    >
      <div className="h-12 w-12 rounded-xl bg-background border border-border/50 flex items-center justify-center mb-6 shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function BenefitItem({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 h-10 w-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-bold mb-1">{title}</h4>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
