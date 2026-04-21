'use client'

import { type GenerateSocialMediaPostOutput } from '@/ai/flows/generate-social-media-post'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Check, Clipboard, Image as ImageIcon, RefreshCw, Send, CalendarClock } from 'lucide-react'
import { useState } from 'react'

interface PostPreviewProps {
  post: GenerateSocialMediaPostOutput
}

export default function PostPreview({ post }: PostPreviewProps) {
  const { toast } = useToast()
  const [copiedText, setCopiedText] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  const handleCopy = (content: string, type: 'text' | 'prompt') => {
    navigator.clipboard.writeText(content)
    if (type === 'text') {
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    } else {
      setCopiedPrompt(true)
      setTimeout(() => setCopiedPrompt(false), 2000)
    }
    toast({ title: 'Copied to clipboard!' })
  }

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Generated Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Post Text</h3>
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
            <h3 className="font-semibold">Image Prompt</h3>
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
            <Send className="mr-2 h-4 w-4" /> Post Now
          </Button>
          <Button variant="secondary">
            <CalendarClock className="mr-2 h-4 w-4" /> Schedule
          </Button>
          <Button variant="outline">
            <ImageIcon className="mr-2 h-4 w-4" /> Generate Image
          </Button>
           <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
