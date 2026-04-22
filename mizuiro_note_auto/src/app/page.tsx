import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { GlassCard, MagicFlowText, ShinyButton } from '@/components/ui/design-system';
import { 
  ArrowRight, 
  PenTool, 
  Sparkles, 
  Heart,
  Palette,
  Zap,
  Globe,
  Award,
  ChevronRight
} from 'lucide-react';

export default function RootPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20 overflow-x-hidden">
      {/* 究極のナビゲーション */}
      <header className="fixed top-0 z-50 w-full border-b border-border/10 bg-background/50 backdrop-blur-2xl">
        <div className="container mx-auto flex h-20 items-center justify-between px-6 lg:px-12">
          <div className="flex items-center gap-3">
            <Logo className="text-2xl" />
            <div className="h-5 w-px bg-border/40 mx-2 hidden md:block" />
            <span className="text-[10px] tracking-[0.4em] font-black text-primary uppercase hidden md:block">The Studio</span>
          </div>
          
          <nav className="hidden lg:flex items-center gap-12 text-[11px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
            <Link href="#philosophy" className="transition-all hover:text-primary hover:tracking-[0.4em]">Philosophy</Link>
            <Link href="#features" className="transition-all hover:text-primary hover:tracking-[0.4em]">Features</Link>
          </nav>

          <div className="flex items-center gap-6">
            <Link href="/login" className="text-[11px] font-black transition-colors hover:text-primary hidden sm:block uppercase tracking-[0.2em]">
              Login
            </Link>
            <ShinyButton className="rounded-full px-10 h-12 shadow-2xl shadow-primary/20 ring-1 ring-white/20">
              <Link href="/signup">無料で始める</Link>
            </ShinyButton>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ヒーローセクション - 完璧なコンポジション */}
        <section className="relative pt-48 pb-40 lg:pt-64 lg:pb-72 overflow-hidden">
          <div className="container mx-auto px-6 text-center relative z-10 max-w-5xl">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-6 py-2.5 text-[10px] font-black text-primary mb-16 tracking-[0.3em] uppercase animate-in fade-in slide-in-from-top-4 duration-1000">
              <Sparkles className="mr-2 h-4 w-4 fill-primary" />
              Creative Intelligence for Writers
            </div>
            
            <h1 className="text-6xl font-black tracking-tighter sm:text-8xl md:text-9xl mb-16 leading-[1.0] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent italic">
              あなたの創作に、<br />
              <span className="text-glow text-primary font-serif">命</span>を吹き込む。
            </h1>
            
            <p className="mx-auto max-w-[800px] text-lg md:text-2xl text-muted-foreground/70 leading-relaxed mb-20 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 font-medium">
              MIZUIRO は、note/Brain での創作活動を最高峰へと導く AI 創作パートナーです。<br className="hidden md:block" />
              あなたの感性と AI の知性が融合し、読者の心を震わせる物語を。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500 mb-32">
              <ShinyButton className="h-20 px-16 rounded-full text-xl font-black shadow-[0_20px_80px_rgba(0,186,255,0.35)] group">
                <Link href="/signup" className="flex items-center gap-3">
                  今すぐスタジオに入る 
                  <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-2" />
                </Link>
              </ShinyButton>
              <Button size="lg" variant="ghost" asChild className="h-20 px-12 text-sm rounded-full hover:bg-primary/5 transition-all font-black tracking-[0.3em] uppercase">
                <Link href="#philosophy">View Philosophy <ChevronRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>

            {/* 視覚的シンボル - 適切に制御された画像 */}
            <div className="relative mx-auto max-w-[500px] aspect-video animate-in zoom-in duration-1000 delay-700">
              <GlassCard className="absolute inset-0 p-2 border-primary/20 bg-primary/5 shadow-2xl overflow-hidden hover:translate-y-0 transition-none ring-1 ring-white/10">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-sky-500/10 rounded-xl flex items-center justify-center relative overflow-hidden group">
                   <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
                   <MagicFlowText text="Creative Studio v2" className="text-3xl font-black text-primary/40 tracking-tighter italic" />
                </div>
              </GlassCard>
            </div>
          </div>
          
          {/* 背景の装飾 */}
          <div className="absolute top-0 left-0 w-full h-[100%] -z-10 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[60rem] h-[60rem] bg-primary/10 rounded-full blur-[180px] animate-pulse" />
            <div className="absolute bottom-[20%] right-[-10%] w-[50rem] h-[50rem] bg-sky-400/5 rounded-full blur-[150px] animate-pulse delay-700 font-black italic opacity-20 text-[20rem] select-none">NOTE</div>
          </div>
        </section>

        {/* 哲学セクション */}
        <section id="philosophy" className="py-40 relative">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center space-y-10 mb-32">
               <h2 className="text-xs font-black tracking-[0.6em] text-primary uppercase">Philosophy</h2>
               <h3 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter italic underline decoration-primary/30 decoration-8 underline-offset-8">
                 ただ書くのではない。<br />
                 「記憶に、刻む」。
               </h3>
               <p className="text-xl text-muted-foreground/60 leading-relaxed font-medium max-w-2xl mx-auto">
                 情報の波に呑まれない、唯一無二の言葉。MIZUIRO は、トレンドの解析から高度な執筆、AIによるビジュアル生成まで、あなたの創作活動を芸術へと昇華させます。
               </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-20 border-t border-border/10">
               <div className="space-y-6">
                 <p className="text-sm font-black tracking-[0.4em] text-muted-foreground uppercase italic px-4 py-1 border-l-2 border-primary">Efficiency</p>
                 <p className="text-4xl font-black text-foreground">90% の手間を、AIが肩代わり。</p>
                 <p className="text-muted-foreground leading-relaxed">煩わしいリサーチや構成作成はAIに。あなたは「クリエイティビティ」にのみ魂を注いでください。</p>
               </div>
               <div className="space-y-6">
                 <p className="text-sm font-black tracking-[0.4em] text-muted-foreground uppercase italic px-4 py-1 border-l-2 border-primary">Quality</p>
                 <p className="text-4xl font-black text-foreground">プロが唸る、圧倒的な読後感。</p>
                 <p className="text-muted-foreground leading-relaxed">あなたの文体、情熱、専門性。それらを完璧に学習したAIパートナーが、共感を生む物語を紡ぎ出します。</p>
               </div>
            </div>
          </div>
        </section>

        {/* 機能セクション */}
        <section id="features" className="py-48 bg-zinc-50/5 dark:bg-zinc-900/5">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 lg:gap-20">
              <FeatureCard 
                icon={<Palette className="h-10 w-10" />}
                title="AIビジュアル生成"
                description="記事の内容から、最適なイメージをAIが自動生成。読者の目を引く「アイキャッチ」を文字通りプロ級の輝きで。"
              />
              <FeatureCard 
                icon={<PenTool className="h-10 w-10" />}
                title="魂を、制御する"
                description="文体、トーン、熱量。あらゆるニュアンスを自在に操り、あなたの言葉に魂を吹き込む高度な執筆エンジン。"
              />
              <FeatureCard 
                icon={<Globe className="h-10 w-10" />}
                title="創作の連鎖"
                description="note, Brain への公開、SNSへの拡散。創作した物語を一瞬で世界中に届けるための、完全なエコシステム。"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="premium" className="py-60 border-t border-border/10 relative overflow-hidden">
          <div className="container mx-auto px-6 text-center max-w-5xl">
             <div className="space-y-16 relative z-10">
               <div className="mx-auto w-24 h-24 rounded-full border border-primary/20 flex items-center justify-center bg-primary/5 shadow-2xl shadow-primary/20">
                  <Award className="h-10 w-10 text-primary" />
               </div>
               <h2 className="text-5xl md:text-8xl font-black tracking-tighter leading-none italic">あなたの最高傑作を、<br />今ここから。</h2>
               <div className="flex flex-col items-center gap-10">
                 <ShinyButton className="h-24 px-20 rounded-full text-3xl font-black shadow-[0_40px_100px_rgba(0,186,255,0.4)]">
                   <Link href="/signup">無料でパートナーを迎える</Link>
                 </ShinyButton>
                 <div className="flex items-center gap-4 text-muted-foreground font-black uppercase tracking-[0.5em] text-[10px]">
                   <span className="w-10 h-px bg-border/40" />
                   Start Your 7-Day Free Trial
                   <span className="w-10 h-px bg-border/40" />
                 </div>
               </div>
             </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/10 py-32 bg-muted/5 opacity-80 hover:opacity-100 transition-opacity">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-20">
           <Logo className="text-3xl grayscale brightness-150" />
           <div className="flex gap-16 text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground">
             <Link href="#" className="hover:text-primary transition-all">Terms</Link>
             <Link href="/privacy" className="hover:text-primary transition-all">Privacy</Link>
             <Link href="#" className="hover:text-primary transition-all">Contact</Link>
           </div>
           <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.5em]">© 2026 MIZUIRO Studio Inc.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <GlassCard className="p-12 border-border/10 group hover:border-primary/40 transition-all duration-700 relative overflow-hidden bg-white/5 border-t-white/10 hover:translate-y-0">
      <div className="h-20 w-20 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center mb-12 text-primary group-hover:scale-110 group-hover:bg-primary transition-all duration-700 group-hover:text-white shadow-xl shadow-primary/5">
        {icon}
      </div>
      <h3 className="text-3xl font-black mb-10 tracking-tighter italic leading-none">{title}</h3>
      <p className="text-muted-foreground/70 leading-relaxed text-lg font-medium">
        {description}
      </p>
    </GlassCard>
  );
}
