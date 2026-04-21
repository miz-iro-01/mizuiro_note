import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, BarChart, DollarSign, Users } from 'lucide-react'

const cardData = [
  {
    title: 'Estimated Revenue',
    value: '¥45,231',
    icon: DollarSign,
    change: '+20.1% from last month',
  },
  {
    title: 'Total Clicks',
    value: '+2,350',
    icon: BarChart,
    change: '+180.1% from last month',
  },
  {
    title: 'Active Posts',
    value: '12',
    icon: Activity,
    change: '2 scheduled for today',
  },
  {
    title: 'New Followers',
    value: '+9k',
    icon: Users,
    change: '+15% from last month',
  },
]

export function AnalyticsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cardData.map((card, index) => (
        <Card
          key={index}
          className="border-border/50 bg-card/60 backdrop-blur-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
