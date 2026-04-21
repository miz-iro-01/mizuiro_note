import PersonasForm from '../settings/components/personas-form'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { UserCircle } from 'lucide-react'

export default function PersonasPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
                <UserCircle className="h-8 w-8 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">ペルソナ（発信キャラクター）設計</h1>
                <p className="text-muted-foreground">AIが代わりに発信するキャラクターを複数作成できます。ジャンルに合わせて使い分けましょう。</p>
            </div>
        </div>
      </div>

      <div className="min-h-[500px]">
          <PersonasForm />
      </div>
    </div>
  )
}
