'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { adminNavLinks, navLinks } from '@/lib/nav-links'
import { cn } from '@/lib/utils'
import { Logo } from '../icons'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Sparkles } from 'lucide-react'
import { useUser } from '@/firebase'

const ADMIN_EMAILS = ['oumaumauma32@gmail.com', 'sl0wmugi9@gmail.com'];

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email)
  const allLinks = isAdmin ? [...navLinks, ...adminNavLinks] : navLinks

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-card/80 backdrop-blur-lg md:flex">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <Logo />
          <span className="sr-only">-MIZUIRO- Rakuten Auto Afi</span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-6 p-4">
        <ul className="flex-1 space-y-1">
          {allLinks.map(item => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-card-foreground/70 transition-all hover:bg-primary/10 hover:text-primary',
                  (pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href))) &&
                    'bg-primary/10 font-medium text-primary'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-auto">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary"/>
                Proにアップグレード
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="mb-4 text-xs text-muted-foreground">
                全ての機能を開放し、サポートチームへの無制限アクセスを手に入れましょう。
              </p>
              <Button size="sm" className="w-full">
                アップグレード
              </Button>
            </CardContent>
          </Card>
        </div>
      </nav>
    </aside>
  )
}
