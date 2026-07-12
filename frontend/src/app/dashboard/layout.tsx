'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
    Bot, Play, FileText, LogOut, ChevronLeft, ChevronRight,
    BarChart3, Shield, Trophy, Sparkles, GitBranch, TrendingUp,
    Target, GitCommit, Brain, Wrench, Link2, Cpu, Activity, Home,
    FolderOpen, Zap, Settings
} from 'lucide-react'

const navSections = [
    {
        label: 'Overview',
        items: [
            { href: '/dashboard/overview', label: 'Dashboard', icon: Home },
            { href: '/dashboard/projects', label: 'Projects', icon: FolderOpen },
            { href: '/dashboard/agents', label: 'Agents', icon: Bot },
        ]
    },
    {
        label: 'Testing',
        items: [
            { href: '/dashboard/benchmarks', label: 'Benchmarks', icon: BarChart3 },
            { href: '/dashboard/scenarios', label: 'Scenarios', icon: Zap },
            { href: '/dashboard/runs', label: 'Runs', icon: Play },
            { href: '/dashboard/memory-eval', label: 'Memory Eval', icon: Brain },
            { href: '/dashboard/tool-eval', label: 'Tool Eval', icon: Wrench },
        ]
    },
    {
        label: 'Improvement',
        items: [
            { href: '/dashboard/improve', label: 'Auto Improve', icon: Sparkles },
            { href: '/dashboard/targeted-improve', label: 'Targeted Improve', icon: Target },
            { href: '/dashboard/regression', label: 'Regression', icon: GitBranch },
            { href: '/dashboard/versions', label: 'Versions', icon: GitCommit },
        ]
    },
    {
        label: 'Analytics',
        items: [
            { href: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp },
            { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy },
            { href: '/dashboard/reports', label: 'Reports', icon: FileText },
        ]
    },
    {
        label: 'Connect',
        items: [
            { href: '/dashboard/mcp', label: 'MCP Connect', icon: Link2 },
            { href: '/dashboard/fingerprint', label: 'Intelligence', icon: Cpu },
            { href: '/dashboard/monitor', label: 'Live Monitor', icon: Activity },
        ]
    }
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
            <aside className={`${collapsed ? 'w-16' : 'w-60'} transition-all duration-300 bg-white border-r border-gray-100 flex flex-col shrink-0`}>
                <div className="p-4 flex items-center justify-between border-b border-gray-100">
                    {!collapsed && (
                        <div>
                            <span className="text-lg font-bold tracking-tight">AgentOS</span>
                            <p className="text-xs text-gray-400">AI Agent Testing</p>
                        </div>
                    )}
                    <button onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition ml-auto shrink-0">
                        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
                    {navSections.map(section => (
                        <div key={section.label}>
                            {!collapsed && (
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
                                    {section.label}
                                </p>
                            )}
                            <div className="space-y-0.5">
                                {section.items.map(item => {
                                    const Icon = item.icon
                                    const isActive = pathname === item.href
                                    return (
                                        <Link key={item.href} href={item.href}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                                    ? 'bg-black text-white'
                                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                }`}>
                                            <Icon size={16} className="shrink-0" />
                                            {!collapsed && <span>{item.label}</span>}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-2 border-t border-gray-100">
                    {!collapsed && user && (
                        <div className="px-3 py-2 mb-1">
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                    )}
                    <button onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition w-full">
                        <LogOut size={16} className="shrink-0" />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}