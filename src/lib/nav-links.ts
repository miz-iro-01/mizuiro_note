import {
  History,
  LayoutDashboard,
  PenSquare,
  Settings,
  Shield,
  CircleUser,
} from 'lucide-react'

export const navLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'ダッシュボード' },
  { href: '/dashboard/content-studio', icon: PenSquare, label: 'コンテンツスタジオ' },
  { href: '/dashboard/personas', icon: CircleUser, label: 'ペルソナ設計' },
  { href: '/dashboard/history', icon: History, label: '履歴' },
  { href: '/dashboard/settings', icon: Settings, label: '設定' },
]

export const adminNavLinks = [
  { href: '/admin', icon: Shield, label: '管理者パネル' },
]
