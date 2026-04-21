'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, BarChart, DollarSign, Users, Loader2 } from 'lucide-react'
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase'
import { collection, query, where, doc } from 'firebase/firestore'
import { useMemo } from 'react'

const cardData = [
  {
    title: '推定収益',
    value: '¥45,231',
    icon: DollarSign,
    change: '+20.1% 先月比',
  },
  {
    title: '合計クリック数',
    value: '+2,350',
    icon: BarChart,
    change: '+180.1% 先月比',
  },
  {
    title: 'アクティブな投稿',
    value: '12',
    icon: Activity,
    change: '2件が本日予約済み',
  },
  {
    title: '新規フォロワー',
    value: '+9k',
    icon: Users,
    change: '+15% 先月比',
  },
]

export function AnalyticsCards() {
  const { user } = useUser()
  const firestore = useFirestore()

  // 1. ユーザー設定の取得 (平均単価のため)
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(firestore, 'users', user.uid)
  }, [firestore, user])
  const { data: userData } = useDoc(userDocRef)
  const unitValue = userData?.averageRakutenUnitValue || 0

  // 2. 投稿履歴の取得
  const activitiesQuery = useMemoFirebase(() => {
    if (!user) return null
    return query(
      collection(firestore, 'activities'),
      where('userId', '==', user.uid)
    )
  }, [firestore, user])
  
  const { data: activities, isLoading } = useCollection(activitiesQuery)

  // 3. 統計の計算
  const stats = useMemo(() => {
    if (!activities) return { earnings: 0, postCount: 0, successCount: 0 }
    
    const successCount = activities.filter(a => a.status === 'success').length
    // 簡易収益計算: 成功数 * 平均単価 * 2%料率
    const earnings = Math.floor(successCount * unitValue * 0.02)
    
    return {
      earnings,
      postCount: activities.length,
      successCount
    }
  }, [activities, unitValue])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-card/40 rounded-xl border border-border/40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">統計データを集計中...</span>
      </div>
    )
  }

  const cardData = [
    {
      title: '推定収益 (目安)',
      value: `¥${stats.earnings.toLocaleString()}`,
      icon: DollarSign,
      change: '活動量に基づく理論値',
    },
    {
      title: '合計投稿数',
      value: stats.postCount.toString(),
      icon: BarChart,
      change: `本日終了分を含む`,
    },
    {
      title: '成功した配信',
      value: stats.successCount.toString(),
      icon: Activity,
      change: '正常にAPI送信完了',
    },
    {
      title: '平均単価設定',
      value: `¥${unitValue.toLocaleString()}`,
      icon: Users,
      change: '設定画面で変更可能',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cardData.map((card, index) => (
        <Card
          key={index}
          className="border-border/50 bg-card/60 backdrop-blur-sm shadow-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
