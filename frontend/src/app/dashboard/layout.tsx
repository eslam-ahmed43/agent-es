'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { LayoutDashboard, Bot, FlaskConical, Play, FileText, LogOut, ChevronLeft, ChevronRight, BarChart3, Shield, Trophy, Sparkles, GitBranch, TrendingUp, Target, GitCommit, LayoutPanelTop, Crown, Brain, Wrench, DollarSign } from 'lucide-react'


const navItems = [
    { href: '/dashboard/overview', label: 'Overview', icon: LayoutPanelTop },
    { href: '/dashboard/projects', label: 'Projects', icon: LayoutDashboard },
    { href: '/dashboard/agents', label: 'Agents', icon: Bot },
    { href: '/dashboard/scenarios', label: 'Scenarios', icon: FlaskConical },
    { href: '/dashboard/benchmarks', label: 'Benchmarks', icon: BarChart3 },
    { href: '/dashboard/runs', label: 'Runs', icon: Play },
    { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/dashboard/rankings', label: 'Rankings', icon: Crown },
    { href: '/dashboard/improve', label: 'Auto Improve', icon: Sparkles },
    { href: '/dashboard/targeted-improve', label: 'Targeted Improve', icon: Target },
    { href: '/dashboard/versions', label: 'Versions', icon: GitCommit },
    { href: '/dashboard/regression', label: 'Regression', icon: GitBranch },
    { href: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp },
    { href: '/dashboard/memory-eval', label: 'Memory Eval', icon: Brain },
    { href: '/dashboard/tool-eval', label: 'Tool Eval', icon: Wrench },
    { href: '/dashboard/cost-analytics', label: 'Cost Analytics', icon: DollarSign },
    { href: '/dashboard/reports', label: 'Reports', icon: FileText },
    { href: '/dashboard/judge-validation', label: 'Judge Validation', icon: Shield }
]


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) { router.push('/login'); return }
            setUser(data.user)
        })
    }, [])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <aside className={`${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col`}>
                <div className="p-4 flex items-center justify-between border-b border-gray-200">
                    {!collapsed && <span className="text-lg font-bold">AgentOS</span>}
                    <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-gray-100 transition ml-auto">
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                            <Link key={item.href} href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}>
                                <Icon size={18} className="shrink-0" />
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        )
                    })}
                </nav>
                <div className="p-3 border-t border-gray-200">
                    {!collapsed && user && (
                        <p className="text-xs text-gray-500 px-3 py-2 truncate">{user.email}</p>
                    )}
                    <button onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition w-full">
                        <LogOut size={18} className="shrink-0" />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>
            <main className="flex-1 overflow-auto p-8">{children}</main>
        </div>
    )
}