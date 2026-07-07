'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Loader2, Sparkles, GitCommit, GitBranch } from 'lucide-react'

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

export default function OverviewPage() {
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

    const getConfidenceColor = (conf: string) =>
        conf === 'High' ? 'text-green-400 bg-green-900/30' :
            conf === 'Medium' ? 'text-yellow-400 bg-yellow-900/30' : 'text-red-400 bg-red-900/30'

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Overview</h1>
                    <p className="text-gray-500 text-sm mt-1">Everything about this agent's reliability, in one place</p>
                </div>
                <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>

            {!overview ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Shield size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No data yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Run a benchmark to see this agent's overview</p>
                </div>
            ) : (
                <>
                    <div className="bg-black text-white rounded-xl p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-gray-400">{overview.agent.name}</p>
                                <p className="text-xs text-gray-500">{overview.agent.model || overview.agent.type}</p>
                            </div>
                            {overview.reliability && (
                                <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(overview.reliability.confidence)}`}>
                                    {overview.reliability.confidence} Confidence
                                </span>
                            )}
                        </div>

                        {overview.reliability ? (
                            <>
                                <div className="flex items-end gap-3 mt-4">
                                    <p className="text-6xl font-bold">{overview.reliability.reliability_score}</p>
                                    <p className="text-sm text-gray-400 mb-2">Reliability Score</p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Based on {overview.reliability.runs_analyzed} runs</p>

                                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-5">
                                    {[
                                        { label: 'Overall', value: overview.reliability.overall },
                                        { label: 'Safety', value: overview.reliability.safety },
                                        { label: 'Relevance', value: overview.reliability.relevance },
                                        { label: 'Consistency', value: overview.reliability.consistency },
                                        { label: 'Helpfulness', value: overview.reliability.helpfulness },
                                        { label: 'Stability', value: overview.reliability.stability }
                                    ].map((m, i) => (
                                        <div key={i} className="bg-white/5 rounded-lg p-3">
                                            <p className="text-xs text-gray-400">{m.label}</p>
                                            <p className="text-lg font-semibold">{m.value}%</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-gray-400 mt-4">No reliability data yet — run a benchmark first.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles size={16} className="text-purple-500" />
                                <p className="text-sm font-semibold">Last Improvement</p>
                            </div>
                            {overview.last_improvement ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-400">v{overview.last_improvement.from_version}</span>
                                        <span>→</span>
                                        <span className="font-medium">v{overview.last_improvement.to_version}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`flex items-center gap-1 text-sm font-medium ${overview.last_improvement.overall_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {overview.last_improvement.overall_change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            Overall {overview.last_improvement.overall_change >= 0 ? '+' : ''}{(overview.last_improvement.overall_change * 100).toFixed(1)}%
                                        </div>
                                        {overview.last_improvement.attack_change !== null && (
                                            <div className={`flex items-center gap-1 text-sm font-medium ${overview.last_improvement.attack_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {overview.last_improvement.attack_change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                Attack {overview.last_improvement.attack_change >= 0 ? '+' : ''}{(overview.last_improvement.attack_change * 100).toFixed(1)}%
                                            </div>
                                        )}
                                    </div>
                                    {overview.last_improvement.improvements.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {overview.last_improvement.improvements.slice(0, 2).map((imp, i) => (
                                                <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{imp}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">No improvement history with scores yet.</p>
                            )}
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <GitBranch size={16} className="text-gray-400" />
                                <p className="text-sm font-semibold">Last Regression Check</p>
                            </div>
                            {overview.last_regression ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        {overview.last_regression.status === 'running' ? (
                                            <Loader2 size={16} className="text-blue-500 animate-spin" />
                                        ) : overview.last_regression.overall_regression ? (
                                            <AlertTriangle size={16} className="text-red-500" />
                                        ) : (
                                            <CheckCircle size={16} className="text-green-500" />
                                        )}
                                        <span className="text-sm font-medium">
                                            {overview.last_regression.status === 'running' ? 'Running...' :
                                                overview.last_regression.overall_regression ? 'Regression Detected' : 'All Clear'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {new Date(overview.last_regression.created_at).toLocaleString()} • {overview.last_regression.results?.length || 0} benchmarks
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">No regression suite has been run yet.</p>
                            )}
                        </div>
                    </div>

                    {(overview.weaknesses.length > 0 || overview.strengths.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {overview.weaknesses.length > 0 && (
                                <div className="bg-white border border-red-200 rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <XCircle size={16} className="text-red-500" />
                                        <p className="text-sm font-semibold text-red-700">Current Weaknesses</p>
                                    </div>
                                    <div className="space-y-2">
                                        {overview.weaknesses.map((w, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColors[w.type] || 'bg-gray-100 text-gray-600'}`}>
                                                    {w.type.replace('_', ' ')}
                                                </span>
                                                <span className="text-sm font-bold text-red-600">{w.avg_score}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {overview.strengths.length > 0 && (
                                <div className="bg-white border border-green-200 rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <CheckCircle size={16} className="text-green-500" />
                                        <p className="text-sm font-semibold text-green-700">Current Strengths</p>
                                    </div>
                                    <div className="space-y-2">
                                        {overview.strengths.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColors[s.type] || 'bg-gray-100 text-gray-600'}`}>
                                                    {s.type.replace('_', ' ')}
                                                </span>
                                                <span className="text-sm font-bold text-green-600">{s.avg_score}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {overview.current_version && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                            <GitCommit size={16} className="text-gray-400" />
                            <p className="text-sm text-gray-600">
                                Currently running <span className="font-semibold">v{overview.current_version.version_number}</span>
                                {overview.current_version.overall_score !== null && (
                                    <span> — {(overview.current_version.overall_score * 100).toFixed(1)}% overall</span>
                                )}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}