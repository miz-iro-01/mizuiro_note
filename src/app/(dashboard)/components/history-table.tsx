import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const recentPosts = [
  {
    persona: 'Expert',
    initials: 'E',
    avatarColor: 'bg-sky-200',
    title: 'Top 5 Gadgets for Your Smart Home',
    clicks: '1.2k',
  },
  {
    persona: 'Friend',
    initials: 'F',
    avatarColor: 'bg-emerald-200',
    title: 'My Favorite Sustainable Fashion Finds',
    clicks: '980',
  },
  {
    persona: 'Creative',
    initials: 'C',
    avatarColor: 'bg-amber-200',
    title: 'DIY: Create Stunning Wall Art on a Budget',
    clicks: '850',
  },
  {
    persona: 'Expert',
    initials: 'E',
    avatarColor: 'bg-sky-200',
    title: 'A Deep Dive into The Latest AI Trends',
    clicks: '720',
  },
    {
    persona: 'Friend',
    initials: 'F',
    avatarColor: 'bg-emerald-200',
    title: 'Weekend Trip Essentials You Need',
    clicks: '650',
  },
]

export function HistoryTable() {
  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Recent Posts</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-8">
        {recentPosts.map((post, index) => (
          <div key={index} className="flex items-center gap-4">
            <Avatar className="hidden h-9 w-9 sm:flex">
              <div
                className={`flex h-full w-full items-center justify-center rounded-full ${post.avatarColor} text-sm font-bold text-foreground/70`}
              >
                {post.initials}
              </div>
            </Avatar>
            <div className="grid gap-1">
              <p className="text-sm font-medium leading-none">{post.title}</p>
              <p className="text-xs text-muted-foreground">{post.persona} Persona</p>
            </div>
            <div className="ml-auto font-medium">+{post.clicks}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
