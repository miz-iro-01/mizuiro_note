import { Card, CardContent } from '@/components/ui/card';

interface BlogPreviewProps {
  title: string;
  content: string;
}

export default function BlogPreview({ title, content }: BlogPreviewProps) {
  // Simple HTML rendering for prefix markers (#, ##, ###)
  const renderedContent = content
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mb-3 mt-6">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mb-2 mt-4">$1</h3>')
    .split('\n')
    .map(line => line.trim() ? `<p class="mb-4 leading-relaxed">${line}</p>` : '')
    .join('');

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0 prose prose-slate max-w-none">
        <header className="mb-8 pb-8 border-b border-border/50">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <span>Blogger Preview Mode</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString('ja-JP')}</span>
          </div>
        </header>
        <div 
          className="blog-content text-foreground/90 whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </CardContent>
    </Card>
  );
}
