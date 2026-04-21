'use client'

import { useState } from 'react'
import { Bot, Loader2, Sparkles, Pin, AtSign } from 'lucide-react'

import {
  identifyTrendingTopics,
  type IdentifyTrendingTopicsOutput,
} from '@/ai/flows/identify-trending-topics'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function TrendAnalyzer() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] =
    useState<IdentifyTrendingTopicsOutput['topics'] | null>(null)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResults(null)
    try {
      const res = await identifyTrendingTopics({ searchQuery: query })
      setResults(res.topics)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'An error occurred.',
        description: 'Failed to identify trending topics. Please try again.',
      })
      console.error('Failed to identify trending topics', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="sticky top-24 border-border/50 bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-6 w-6" /> AI Trend Analyzer
        </CardTitle>
        <CardDescription>
          Discover clickable topics on Pinterest & Threads.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="e.g., 'sustainable living'"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading} size="icon">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span className="sr-only">Analyze</span>
          </Button>
        </form>
      </CardContent>

      <ScrollArea className="h-[calc(100vh-30rem)]">
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Analyzing trends...</p>
            </div>
          )}

          {!isLoading && !results && (
             <div className="text-center text-sm text-muted-foreground p-8">
                <p>Enter a topic above to find trending content ideas.</p>
            </div>
          )}
          
          {results?.map((topic, index) => (
            <div
              key={index}
              className="space-y-3 rounded-lg border bg-background/50 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{topic.topicName}</h3>
                <div className="flex gap-1.5">
                  {topic.platforms.includes('Pinterest') && <Pin className="h-4 w-4 text-red-500" />}
                  {topic.platforms.includes('Threads') && <AtSign className="h-4 w-4 text-gray-500" />}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {topic.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {topic.keywords.map(keyword => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  )
}
