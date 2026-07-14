'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
    Bot, Play, FileText, LogOut, ChevronLeft, ChevronRight,
    BarChart3, Sparkles, TrendingUp, Home, Settings,
    ChevronDown, ChevronUp
} from 'lucide-react'

const navItems = [
    {
        href: '/dashboard/overview',
        label: 'Home',
        icon: Home,
        sub: []
    },
    {
        href: '/dashboard/agents',
        label: 'Agents',
        icon: Bot,
        sub: [
            { href: '/dashboard/projects', label: 'Projects' },
            { href: '/dashboard/scenarios', label: 'Scenarios' },
            { href: '/dashboard/mcp', label: 'MCP Connect' },
        ]
    },
    {
        href: '/dashboard/benchmarks',
        label: 'Test',
        icon: Play,
        sub: [
            { href: '/dashboard/benchmarks', label: 'Benchmarks' },
            { href: '/dashboard/runs', label: 'Runs' },
            { href: '/dashboard/memory-eval', label: 'Memory' },
            { href: '/dashboard/tool-eval', label: 'Tool Calling' },
            { href: '/dashboard/regression', label: 'Regression' },
        ]
    },
    {
        href: '/dashboard/analytics',
        label: 'Results',
        icon: TrendingUp,
        sub: [
            { href: '/dashboard/analytics', label: 'Analytics' },
            { href: '/dashboard/leaderboard', label: 'Leaderboard' },
            { href: '/dashboard/reports', label: 'Reports' },
            { href: '/dashboard/versions', label: 'Versions' },
        ]
    },
    {
        href: '/dashboard/improve',
        label: 'Improve',
        icon: Sparkles,
        sub: [
            { href: '/dashboard/improve', label: 'Auto Improve' },
            { href: '/dashboard/targeted-improve', label: 'Targeted' },
        ]
    },
    {
        href: '/dashboard/fingerprint',
        label: 'Intelligence',
        icon: BarChart3,
        sub: [
            { href: '/dashboard/fingerprint', label: 'Agent Analysis' },
            { href: '/dashboard/monitor', label: 'Live Monitor' },
            { href: '/dashboard/certification', label: 'Certification' },
        ]
    },
    {
        href: '/dashboard/reports',
        label: 'Reports',
        icon: FileText,
        sub: []
    },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [user, setUser] = useState<any>(null)
    const [collapsed, setCollapsed] = useState(false)
    const [openSections, setOpenSections] = useState<string[]>(['Test', 'Agents'])

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) { router.push('/login'); return }
            setUser(data.user)
        })

        navItems.forEach(item => {
            if (item.sub.some(s => s.href === pathname)) {
                setOpenSections(prev => [...new Set([...prev, item.label])])
            }
        })
    }, [pathname])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    const toggleSection = (label: string) => {
        setOpenSections(prev =>
            prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
        )
    }

    const isActiveGroup = (item: typeof navItems[0]) => {
        return pathname === item.href || item.sub.some(s => s.href === pathname)
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <aside className={`${collapsed ? 'w-16' : 'w-56'} transition-all duration-200 bg-white border-r border-gray-100 flex flex-col shrink-0 fixed h-full z-10`}>

                <div className="p-4 flex items-center justify-between border-b border-gray-100">
                    {!collapsed && (
                        <div>
                            <p className="text-base font-bold tracking-tight">AgentOS</p>
                            <p className="text-xs text-gray-400 mt-0.5">CI/CD for AI Agents</p>
                        </div>
                    )}
                    <button onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition ml-auto">
                        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-2 px-2">
                    {navItems.map(item => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        const isGroupActive = isActiveGroup(item)
                        const isOpen = openSections.includes(item.label)
                        const hasSub = item.sub.length > 0

                        return (
                            <div key={item.href}>
                                {hasSub ? (
                                    <button
                                        onClick={() => toggleSection(item.label)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5 ${isGroupActive
                                                ? 'text-black bg-gray-100'
                                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                            }`}>
                                        <Icon size={16} className="shrink-0" />
                                        {!collapsed && (
                                            <>
                                                <span className="flex-1 text-left">{item.label}</span>
                                                {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <Link href={item.href}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5 ${isActive
                                                ? 'bg-black text-white'
                                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                            }`}>
                                        <Icon size={16} className="shrink-0" />
                                        {!collapsed && <span>{item.label}</span>}
                                    </Link>
                                )}

                                {hasSub && isOpen && !collapsed && (
                                    <div className="ml-4 pl-3 border-l border-gray-100 mb-1 space-y-0.5">
                                        {item.sub.map(sub => {
                                            const isSubActive = pathname === sub.href
                                            return (
                                                <Link key={sub.href} href={sub.href}
                                                    className={`flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${isSubActive
                                                            ? 'bg-black text-white'
                                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                                        }`}>
                                                    {sub.label}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </nav>

                <div className="p-2 border-t border-gray-100">
                    {!collapsed && user && (
                        <div className="px-3 py-2 mb-1 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                    )}
                    <button onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition w-full">
                        <LogOut size={16} className="shrink-0" />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            <main className={`flex-1 overflow-auto transition-all duration-200 ${collapsed ? 'ml-16' : 'ml-56'}`}>
                <div className="max-w-5xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}