'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Loader2, Sparkles, GitCommit, GitBranch, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Agent { id: string; name: string; model: string; type: string }
interface Reliability {
    reliability_score: number
    overall: number
    safety: number
    relevance: number
    consistency: number
    helpfulness: number
    stability: number
    pass_rate: number
    confidence: string
    runs_analyzed: number
}
interface WeakStrength { type: string; avg_score: number; pass_rate: number; total: number }
interface CurrentVersion {
    version_number: number
    overall_score: number | null
    attack_score: number | null
    created_at: string
}
interface LastImprovement {
    from_version: number
    to_version: number
    overall_change: number
    attack_change: number | null
    improvements: string[]
}
interface LastRegression {
    status: string
    overall_regression: boolean
    created_at: string
    results: any[]
}
interface Overview {
    agent: Agent
    reliability: Reliability | null
    weaknesses: WeakStrength[]
    strengths: WeakStrength[]
    current_version: CurrentVersion | null
    last_improvement: LastImprovement | null
    last_regression: LastRegression | null
}

const typeColors: Record<string, string> = {
    persona: 'bg-blue-100 text-blue-700',
    edge_case: 'bg-yellow-100 text-yellow-700',
    attack: 'bg-red-100 text-red-700',
    long_conversation: 'bg-green-100 text-green-700'
}

const getScoreColor = (score: number) =>
    score >= 90 ? 'text-green-400' : score >= 75 ? 'text-yellow-400' : 'text-red-400'

export default function OverviewPage() {
    const router = useRouter()
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [overview, setOverview] = useState<Overview | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchOverview = async (agent_id: string) => {
        try {
            const res = await api.get<{ success: boolean; data: Overview }>(`/api/overview/${agent_id}`)
            setOverview(res.data)
        } catch (err) { console.error(err) }
    }

    useEffect(() => {
        api.get<{ success: boolean; data: Agent[] }>('/api/agents')
            .then(async res => {
                setAgents(res.data || [])
                if (res.data?.length > 0) {
                    setSelectedAgent(res.data[0].id)
                    await fetchOverview(res.data[0].id)
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleAgentChange = async (agent_id: string) => {
        setSelectedAgent(agent_id)
        setLoading(true)
        await fetchOverview(agent_id)
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Overview</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Agent reliability at a glance</p>
                </div>
                <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white">
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>

            {!overview || !overview.reliability ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <Shield size={28} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No data yet</h3>
                    <p className="text-gray-500 text-sm mb-6 max-w-xs">
                        Run a benchmark to see your agent's reliability score, strengths, and weaknesses.
                    </p>
                    <button onClick={() => router.push('/dashboard/benchmarks')}
                        className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                        Run First Benchmark <ArrowRight size={14} />
                    </button>
                </div>
            ) : (
                <>
                    {/* Reliability Score */}
                    <div className="bg-black text-white rounded-2xl p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="font-semibold">{overview.agent.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{overview.agent.model || overview.agent.type}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500">{overview.reliability.runs_analyzed} runs analyzed</p>
                                {overview.current_version && (
                                    <p className="text-xs text-gray-500 mt-0.5">v{overview.current_version.version_number}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-end gap-3 mb-5">
                            <p className={`text-7xl font-bold ${getScoreColor(overview.reliability.reliability_score)}`}>
                                {overview.reliability.reliability_score}
                            </p>
                            <div className="mb-2">
                                <p className="text-sm text-gray-400">Reliability Score</p>
                                <p className="text-xs text-gray-500">out of 100</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {[
                                { label: 'Overall', value: overview.reliability.overall },
                                { label: 'Safety', value: overview.reliability.safety },
                                { label: 'Relevance', value: overview.reliability.relevance },
                                { label: 'Consistency', value: overview.reliability.consistency },
                                { label: 'Helpfulness', value: overview.reliability.helpfulness },
                                { label: 'Stability', value: overview.reliability.stability }
                            ].map((m, i) => (
                                <div key={i} className="bg-white/5 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-1">{m.label}</p>
                                    <p className={`text-base font-bold ${getScoreColor(m.value)}`}>{m.value}%</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Strengths & Weaknesses */}
                    {(overview.weaknesses.length > 0 || overview.strengths.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {overview.strengths.length > 0 && (
                                <div className="bg-white border border-gray-100 rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                                            <CheckCircle size={13} className="text-green-600" />
                                        </div>
                                        <p className="text-sm font-semibold">Strengths</p>
                                    </div>
                                    <div className="space-y-2">
                                        {overview.strengths.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between py-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColors[s.type] || 'bg-gray-100 text-gray-600'}`}>
                                                    {s.type.replace('_', ' ')}
                                                </span>
                                                <span className="text-sm font-bold text-green-600">{s.avg_score}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {overview.weaknesses.length > 0 && (
                                <div className="bg-white border border-gray-100 rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
                                            <XCircle size={13} className="text-red-500" />
                                        </div>
                                        <p className="text-sm font-semibold">Weaknesses</p>
                                    </div>
                                    <div className="space-y-2">
                                        {overview.weaknesses.map((w, i) => (
                                            <div key={i} className="flex items-center justify-between py-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColors[w.type] || 'bg-gray-100 text-gray-600'}`}>
                                                    {w.type.replace('_', ' ')}
                                                </span>
                                                <span className="text-sm font-bold text-red-500">{w.avg_score}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Last Improvement + Regression */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-100 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={15} className="text-purple-500" />
                                <p className="text-sm font-semibold">Last Improvement</p>
                            </div>
                            {overview.last_improvement ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-400 text-xs">v{overview.last_improvement.from_version}</span>
                                        <span className="text-gray-300">→</span>
                                        <span className="font-semibold text-xs">v{overview.last_improvement.to_version}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 text-sm font-semibold ${overview.last_improvement.overall_change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {overview.last_improvement.overall_change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {overview.last_improvement.overall_change >= 0 ? '+' : ''}{(overview.last_improvement.overall_change * 100).toFixed(1)}% overall
                                    </div>
                                    {overview.last_improvement.improvements.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {overview.last_improvement.improvements.slice(0, 2).map((imp, i) => (
                                                <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{imp}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">No improvement history yet.</p>
                            )}
                        </div>

                        <div className="bg-white border border-gray-100 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <GitBranch size={15} className="text-gray-400" />
                                <p className="text-sm font-semibold">Regression Check</p>
                            </div>
                            {overview.last_regression ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        {overview.last_regression.status === 'running' ? (
                                            <Loader2 size={15} className="text-blue-500 animate-spin" />
                                        ) : overview.last_regression.overall_regression ? (
                                            <AlertTriangle size={15} className="text-red-500" />
                                        ) : (
                                            <CheckCircle size={15} className="text-green-500" />
                                        )}
                                        <span className="text-sm font-medium">
                                            {overview.last_regression.status === 'running' ? 'Running...' :
                                                overview.last_regression.overall_regression ? 'Issues detected' : 'All clear'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {new Date(overview.last_regression.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">No regression test run yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Version */}
                    {overview.current_version && (
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center gap-3">
                            <GitCommit size={15} className="text-gray-400" />
                            <p className="text-sm text-gray-600">
                                Running <span className="font-semibold">v{overview.current_version.version_number}</span>
                                {overview.current_version.overall_score !== null && (
                                    <span className="text-gray-400"> — {(overview.current_version.overall_score * 100).toFixed(1)}% score</span>
                                )}
                            </p>
                            <button onClick={() => router.push('/dashboard/improve')}
                                className="ml-auto text-xs text-black font-medium hover:underline flex items-center gap-1">
                                Improve <ArrowRight size={11} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}