'use client'

import { adminNavLinks, navLinks } from '@/lib/nav-links'
import { cn } from '@/lib/utils'
import { Menu, Sparkles, LogOut, LogIn } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet'
import { Logo } from '../icons'
import { useAuth, useUser } from '@/firebase'
import { signOut } from 'firebase/auth'

export default function Header() {
  const pathname = usePathname()
  const allLinks = [...navLinks, ...adminNavLinks]
  const { user, isUserLoading } = useUser()
  const auth = useAuth();

  const handleLogout = () => {
    if(auth) {
      signOut(auth);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">ナビゲーションメニューを開く</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col p-0">
            <div className="flex h-16 shrink-0 items-center border-b px-6">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 font-semibold"
              >
                <Logo />
              </Link>
            </div>
            <nav className="flex-1 space-y-1 p-4">
              {allLinks.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:text-primary',
                    (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) && 'text-primary'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex w-full items-center justify-end gap-4">
        <Button variant="outline" size="sm" className="hidden sm:flex">
          アップグレード
          <Sparkles className="ml-2 h-4 w-4" />
        </Button>
        {isUserLoading ? (
           <Avatar className="h-8 w-8">
             <AvatarFallback>?</AvatarFallback>
           </Avatar>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.photoURL ?? "https://picsum.photos/seed/user-avatar/40/40"}
                    alt={user.displayName ?? "ユーザー"}
                  />
                  <AvatarFallback>{user.email?.[0].toUpperCase() ?? 'U'}</AvatarFallback>
                </Avatar>
                <span className="sr-only">ユーザーメニューを開く</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>マイアカウント</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">設定</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>サポート</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild>
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              ログイン
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}
