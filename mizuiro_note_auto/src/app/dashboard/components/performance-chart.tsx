'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase'
import { collection, query, where, doc } from 'firebase/firestore'
import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'

const defaultData = [
  { name: '1月', total: 0 },
  { name: '2月', total: 0 },
  { name: '3月', total: 0 },
  { name: '4月', total: 0 },
  { name: '5月', total: 0 },
  { name: '6月', total: 0 },
  { name: '7月', total: 0 },
  { name: '8月', total: 0 },
  { name: '9月', total: 0 },
  { name: '10月', total: 0 },
  { name: '11月', total: 0 },
  { name: '12月', total: 0 },
]

export function PerformanceChart() {
  const { user } = useUser()
  const firestore = useFirestore()

  // 1. ユーザー設定の取得
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(firestore, 'users', user.uid)
  }, [firestore, user])
  const { data: userData } = useDoc(userDocRef)
  const unitValue = userData?.averageRakutenUnitValue || 0

  // 2. 全投稿履歴の取得
  const activitiesQuery = useMemoFirebase(() => {
    if (!user) return null
    return query(
      collection(firestore, 'activities'),
      where('userId', '==', user.uid)
    )
  }, [firestore, user])
  
  const { data: activities, isLoading } = useCollection(activitiesQuery)

  // 3. 月別集計ロジック
  const chartData = useMemo(() => {
    const dataMap: Record<number, number> = {}
    // デフォルト値を0で初期化 (1月〜12月)
    for (let i = 0; i < 12; i++) dataMap[i] = 0

    if (activities) {
      activities.forEach(activity => {
        if (activity.status === 'success' && activity.timestamp?.toDate) {
          const date = activity.timestamp.toDate()
          const month = date.getMonth() // 0-11
          // 推定収益の加算 (単価 * 2%料率)
          dataMap[month] += Math.floor(unitValue * 0.02)
        }
      })
    }

    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    return monthNames.map((name, i) => ({
      name,
      total: dataMap[i]
    }))
  }, [activities, unitValue])

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center h-[350px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>パフォーマンス概要</CardTitle>
        <CardDescription>月間推定収益</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={value => `¥${value.toLocaleString()}`}
            />
            <Bar
              dataKey="total"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              animationDuration={1500}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
