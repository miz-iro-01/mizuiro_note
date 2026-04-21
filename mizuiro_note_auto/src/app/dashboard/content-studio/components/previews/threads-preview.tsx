import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Heart, MessageCircle, Repeat2, Send } from 'lucide-react';

interface ThreadsPreviewProps {
  text: string;
  imageUrl: string;
}

export default function ThreadsPreview({ text, imageUrl }: ThreadsPreviewProps) {
  return (
    <div className="flex justify-center p-8 bg-black/5 rounded-xl">
      <Card className="w-full max-w-[500px] bg-white border-border/40 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
             <span className="text-slate-500 font-bold">M</span>
          </div>
          <div className="flex-1 space-y-3">
            <header className="flex justify-between items-center">
              <span className="font-bold text-sm tracking-tight">mizuiro_user</span>
              <span className="text-xs text-muted-foreground">30m</span>
            </header>
            <p className="text-[15px] leading-snug whitespace-pre-wrap">
              {text}
            </p>
            {imageUrl && (
              <div className="relative aspect-square w-full rounded-xl border border-border/20 overflow-hidden bg-muted">
                <Image 
                  src={imageUrl} 
                  alt="Threads Photo" 
                  fill 
                  className="object-cover"
                />
              </div>
            )}
            <footer className="flex gap-4 pt-2 text-muted-foreground">
              <Heart className="h-5 w-5 hover:text-rose-500 cursor-pointer transition-colors" />
              <MessageCircle className="h-5 w-5 hover:text-sky-500 cursor-pointer transition-colors" />
              <Repeat2 className="h-5 w-5 hover:text-emerald-500 cursor-pointer transition-colors" />
              <Send className="h-5 w-5 hover:text-primary cursor-pointer transition-colors" />
            </footer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
