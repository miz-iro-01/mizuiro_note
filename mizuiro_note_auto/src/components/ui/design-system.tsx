'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Premium Glass Card
 * 透過とブラーを活かしたプレミアムなカードコンポーネント
 */
export const GlassCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }
>(({ className, hover = true, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "glass-card p-6 transition-all duration-300",
      hover && "hover:shadow-primary/10 hover:-translate-y-1",
      className
    )}
    {...props}
  />
));
GlassCard.displayName = "GlassCard";

/**
 * Premium Shiny Button
 * 光沢感のあるプレミアムなボタン（既存のButtonをラップまたは置換して使用）
 */
export const ShinyButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "premium-gradient px-6 py-2 rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
      className
    )}
    {...props}
  />
));
ShinyButton.displayName = "ShinyButton";

/**
 * Magic Flow Text
 * 生成中などのテキストに生命感を与えるアニメーション
 */
export const MagicFlowText = ({ text, className }: { text: string; className?: string }) => {
  return (
    <span className={cn("animate-pulse text-glow", className)}>
      {text}
    </span>
  );
};
