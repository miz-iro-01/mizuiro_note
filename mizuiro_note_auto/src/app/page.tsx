"use client";

import React from 'react';
import { useEditorStore, Platform } from '@/lib/store';
import { Brain, FileText, X as XIcon, Layout, ShieldCheck, PenTool, Image as LucideImage, Smartphone } from 'lucide-react';
import { clsx } from 'clsx';

export default function Home() {
  const { platform, setPlatform, blocks } = useEditorStore();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* サイドバー */}
      <aside className="w-80 border-r bg-card p-6 flex flex-col gap-8 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold">A</div>
          <h1 className="text-xl font-bold tracking-tight">AI Content Studio</h1>
        </div>

        {/* プラットフォーム選択 */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Platform</h2>
          <div className="grid grid-cols-3 gap-2">
            {(['brain', 'note', 'x'] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={clsx(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:shadow-md",
                  platform === p ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20" : "border-border text-muted-foreground"
                )}
              >
                {p === 'brain' && <Brain className="w-5 h-5" />}
                {p === 'note' && <FileText className="w-5 h-5" />}
                {p === 'x' && <XIcon className="w-5 h-5" />}
                <span className="text-[10px] font-bold uppercase">{p}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ツールメニュー */}
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Tools</h2>
          <NavItem icon={<PenTool className="w-4 h-4" />} label="記事生成・壁打ち" active />
          <NavItem icon={<ShieldCheck className="w-4 h-4" />} label="ペルソナ・設定" />
          <NavItem icon={<LucideImage className="w-4 h-4" />} label="画像生成" />
          <NavItem icon={<Layout className="w-4 h-4" />} label="定型文・CTA" />
        </section>

        <section className="mt-auto pt-6 border-t">
          <div className="p-4 rounded-2xl bg-secondary/50 border border-secondary">
            <h3 className="text-xs font-bold mb-1">現在のペルソナ</h3>
            <p className="text-xs text-muted-foreground italic">"30代後半、副業で月5万を目指す会社員"</p>
          </div>
        </section>
      </aside>

      {/* メインエディタエリア */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center justify-between px-8 bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <span className={clsx(
              "px-3 py-1 rounded-full text-xs font-bold text-white",
              platform === 'brain' ? "bg-orange-500" : platform === 'note' ? "bg-teal-500" : "bg-black"
            )}>
              {platform.toUpperCase()} 編集モード
            </span>
          </div>
          <div className="flex gap-4">
            <button className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors">保存</button>
            <button className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:shadow-lg transition-all">コピペ用出力</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="group relative p-6 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-xl transition-all cursor-text"
              >
                <div className="absolute left-0 top-1/2 -translate-x-12 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-2 cursor-grab active:cursor-grabbing hover:bg-secondary rounded-lg">
                    <Layout className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                
                {block.type === 'title' && <h1 className="text-4xl font-black tracking-tight mb-2">{block.content}</h1>}
                {block.type === 'h2' && <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">{block.content}</h2>}
                {block.type === 'text' && <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">{block.content}</p>}
                
                <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-[10px] font-bold uppercase py-1 px-2 rounded bg-secondary hover:bg-secondary/80">AIリライト</button>
                  <button className="text-[10px] font-bold uppercase py-1 px-2 rounded bg-secondary hover:bg-secondary/80">要約</button>
                </div>
              </div>
            ))}

            <button className="mt-4 py-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all">
              < PenTool className="w-6 h-6" />
              <span className="font-bold">新しいブロックを追加</span>
            </button>
          </div>
        </div>
      </main>

      {/* プレビューサイドバー */}
      <aside className="w-96 border-l bg-slate-50 dark:bg-slate-900/50 p-8 overflow-y-auto hidden xl:block">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            スマホプレビュー
          </h2>
          <span className="text-[10px] font-bold py-1 px-2 bg-green-500/10 text-green-600 rounded">可読性 OK</span>
        </div>

        <div className="relative mx-auto w-[280px] h-[550px] border-[12px] border-zinc-900 rounded-[3rem] bg-white dark:bg-zinc-950 overflow-hidden shadow-2xl">
          <div className="absolute top-0 w-full h-6 bg-zinc-900 flex justify-center items-center">
             <div className="w-20 h-4 bg-zinc-900 rounded-b-xl border-x border-b border-zinc-800"></div>
          </div>
          <div className="p-4 pt-10 h-full overflow-y-auto space-y-4">
             {blocks.map((block) => (
                <div key={`pv-${block.id}`}>
                  {block.type === 'title' && <h1 className="text-lg font-bold leading-tight">{block.content}</h1>}
                  {block.type === 'h2' && <h2 className="text-md font-bold mt-4 border-l-2 border-primary pl-2">{block.content}</h2>}
                  {block.type === 'text' && <p className="text-sm text-slate-600 leading-normal">{block.content}</p>}
                </div>
             ))}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
             <h4 className="text-xs font-bold text-orange-600 mb-2 uppercase">AI アラート</h4>
             <p className="text-[11px] text-orange-800">「なぜ今、AIツールが...」のセクションが4行を超えています。改行を推奨します。</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={clsx(
      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
      active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-secondary"
    )}>
      {icon}
      {label}
    </button>
  );
}
