'use client'

import { useEffect } from 'react'
import {
  AnalyticsCards,
} from './components/analytics-cards'
import { HistoryTable } from './components/history-table'
import {
  PerformanceChart,
} from './components/performance-chart'
import { useUser } from '@/firebase'
import { useToast } from '@/hooks/use-toast'
import { diagnoseAvailableModels } from '@/ai/diagnose'

export default function DashboardPage() {
  const { user } = useUser()

  useEffect(() => {
    // 診断実行
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''; 
    diagnoseAvailableModels(apiKey).then(models => {
      console.log('🚀 実際に使えるモデルリスト:', models);
    });
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold">ダッシュボード</h1>
      <AnalyticsCards />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>
        <div className="lg:col-span-1">
          <HistoryTable />
        </div>
      </div>
    </div>
  )
}
