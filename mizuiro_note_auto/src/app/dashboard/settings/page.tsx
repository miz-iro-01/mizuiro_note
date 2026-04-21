import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import IntegrationsForm from './components/integrations-form'
import SubscriptionForm from './components/subscription-form'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab: string }>
}) {
  const resolvedParams = await searchParams;
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold tracking-tight">高度な設定</h1>
        <p className="text-muted-foreground">システムの連携設定、APIキー、サブスクリプションを管理します。</p>
      </div>

      <Tabs defaultValue={resolvedParams.tab || "integrations"} className="w-full">
        <TabsList>
          <TabsTrigger value="integrations">API連携</TabsTrigger>
          <TabsTrigger value="subscription">サブスクリプション</TabsTrigger>
        </TabsList>
        <TabsContent value="integrations">
            <Card className="border-border/50 bg-card/60 backdrop-blur-sm mt-4">
              <CardHeader>
                <CardTitle>API連携</CardTitle>
                <CardDescription>
                  楽天APIやGoogle APIの鍵、その他のSNS連携設定を管理します。
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <IntegrationsForm />
              </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="subscription">
            <Card className="border-border/50 bg-card/60 backdrop-blur-sm mt-4">
              <CardHeader>
                <CardTitle>サブスクリプションの管理</CardTitle>
                <CardDescription>
                  現在のプランと請求の詳細を表示します。
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <SubscriptionForm />
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
