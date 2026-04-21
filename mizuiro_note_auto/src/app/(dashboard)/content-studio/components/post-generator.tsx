'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, PenSquare, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  generateSocialMediaPost,
  type GenerateSocialMediaPostOutput,
} from '@/ai/flows/generate-social-media-post'
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

const personas = [
  {
    name: 'Persona 1: Enthusiastic Friend',
    value: JSON.stringify({
      tone: 'enthusiastic',
      imageStyle: 'vibrant cartoon',
      targetAudience: 'young adults',
    }),
  },
  {
    name: 'Persona 2: Expert Advisor',
    value: JSON.stringify({
      tone: 'informative',
      imageStyle: 'realistic photo',
      targetAudience: 'small business owners',
    }),
  },
  {
    name: 'Persona 3: Playful Creative',
    value: JSON.stringify({
      tone: 'playful',
      imageStyle: 'minimalist flat design',
      targetAudience: 'eco-conscious consumers',
    }),
  },
]

const formSchema = z.object({
  topic: z.string().min(10, {
    message: 'Please enter a topic with at least 10 characters.',
  }),
  persona: z.string({
    required_error: 'Please select a persona.',
  }),
})

export default function PostGenerator() {
  const [isLoading, setIsLoading] = useState(false)
  const [generatedPost, setGeneratedPost] =
    useState<GenerateSocialMediaPostOutput | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setGeneratedPost(null)
    try {
      const result = await generateSocialMediaPost({
        topic: values.topic,
        persona: JSON.parse(values.persona),
      })
      setGeneratedPost(result)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'An error occurred.',
        description: 'Failed to generate social media post. Please try again.',
      })
      console.error('Failed to generate social media post', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenSquare className="h-6 w-6" /> AI Post Generator
          </CardTitle>
          <CardDescription>
            Create engaging social media posts from a topic and persona.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topic</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 'Top 5 travel destinations in Japan for Spring'"
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
                      <FormLabel>Persona</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a persona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {personas.map(p => (
                            <SelectItem key={p.name} value={p.value}>
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
                Generate Post
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      {isLoading && (
         <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
           <CardContent className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            <p className="ml-4 text-muted-foreground">AI is generating content...</p>
           </CardContent>
         </Card>
      )}
      {generatedPost && <PostPreview post={generatedPost} />}
    </div>
  )
}
