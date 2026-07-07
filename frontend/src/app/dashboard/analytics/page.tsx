'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { TrendingUp, Shield, Brain, Zap, BarChart3, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface HistoricalScore {
    id: string
    overall_score: number
    safety_score: number
    relevance_score: number
    consistency_score: number
    helpfulness_score: number
    passed_count: number
    failed_count: number
    prompt_version: number
    recorded_at: string
    benchmarks: { name: string; domain: string }
}

interface ReliabilityScore {
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

interface TypePerformance {
    type: string
    avg_score: number
    pass_rate: number
    total: number
}

interface Analytics {
    type_performance: TypePerformance[]
    strengths: TypePerformance[]
    weaknesses: TypePerformance[]
}

interface Agent { id: string; name: string }
interface Benchmark { id: string; name: string; domain: string }

const ScoreGauge = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-xs">
            <span className="text-gray-500">{label}</span>
            <span className={`font-semibold ${color}`}>{value}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`} style={{ width: `${value}%` }} />
        </div>
    </div>
)

export default function AnalyticsPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [selectedBenchmark, setSelectedBenchmark] = useState('')
    const [history, setHistory] = useState<HistoricalScore[]>([])
    const [reliability, setReliability] = useState<ReliabilityScore | null>(null)
    const [analytics, setAnalytics] = useState<Analytics | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            api.get<{ success: boolean; data: Agent[] }>('/api/agents'),
            api.get<{ success: boolean; data: Benchmark[] }>('/api/benchmarks')
        ]).then(([agentsRes, benchRes]) => {
            setAgents(agentsRes.data || [])
            setBenchmarks(benchRes.data || [])
            if (agentsRes.data?.length > 0) {
                setSelectedAgent(agentsRes.data[0].id)
                fetchData(agentsRes.data[0].id, '')
            }
        }).catch(console.error).finally(() => setLoading(false))
    }, [])

    const fetchData = async (agent_id: string, benchmark_id: string) => {
        try {
            const url = benchmark_id
                ? `/api/analytics/history/${agent_id}?benchmark_id=${benchmark_id}`
                : `/api/analytics/history/${agent_id}`

            const [histRes, relRes, anaRes] = await Promise.all([
                api.get<{ success: boolean; data: HistoricalScore[] }>(url),
                api.get<{ success: boolean; data: ReliabilityScore }>(`/api/analytics/reliability/${agent_id}`),
                api.get<{ success: boolean; data: Analytics }>(`/api/analytics/performance/${agent_id}`)
            ])
            setHistory(histRes.data || [])
            setReliability(relRes.data || null)
            setAnalytics(anaRes.data || null)
        } catch (err) { console.error(err) }
    }

    const handleAgentChange = (agent_id: string) => {
        setSelectedAgent(agent_id)
        fetchData(agent_id, selectedBenchmark)
    }

    const handleBenchmarkChange = (benchmark_id: string) => {
        setSelectedBenchmark(benchmark_id)
        fetchData(selectedAgent, benchmark_id)
    }

    const getConfidenceColor = (conf: string) =>
        conf === 'High' ? 'text-green-600 bg-green-50' :
            conf === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'

    const typeColors: Record<string, string> = {
        persona: 'bg-blue-100 text-blue-700',
        edge_case: 'bg-yellow-100 text-yellow-700',
        attack: 'bg-red-100 text-red-700',
        long_conversation: 'bg-green-100 text-green-700',
        unknown: 'bg-gray-100 text-gray-600'
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Analytics</h1>
                    <p className="text-gray-500 text-sm mt-1">Historical trends and reliability scores</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select value={selectedBenchmark} onChange={(e) => handleBenchmarkChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                        <option value="">All Benchmarks</option>
                        {benchmarks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : (
                <>
                    {reliability && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-black text-white rounded-xl p-6 md:col-span-1">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm text-gray-400">Reliability Score</p>
                                    <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(reliability.confidence)}`}>
                                        {reliability.confidence} Confidence
                                    </span>
                                </div>
                                <p className="text-5xl font-bold mb-1">{reliability.reliability_score}</p>
                                <p className="text-xs text-gray-400 mb-4">Based on {reliability.runs_analyzed} runs</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Stability</span>
                                        <span className="text-white font-medium">{reliability.stability}%</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Pass Rate</span>
                                        <span className="text-white font-medium">{reliability.pass_rate}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-xl p-6 md:col-span-2">
                                <p className="text-sm font-semibold mb-4">Score Breakdown</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <ScoreGauge label="Overall" value={reliability.overall}
                                        color={reliability.overall >= 80 ? 'text-green-600' : 'text-yellow-600'} />
                                    <ScoreGauge label="Safety" value={reliability.safety}
                                        color={reliability.safety >= 80 ? 'text-green-600' : 'text-yellow-600'} />
                                    <ScoreGauge label="Relevance" value={reliability.relevance}
                                        color={reliability.relevance >= 80 ? 'text-green-600' : 'text-yellow-600'} />
                                    <ScoreGauge label="Consistency" value={reliability.consistency}
                                        color={reliability.consistency >= 80 ? 'text-green-600' : 'text-yellow-600'} />
                                    <ScoreGauge label="Helpfulness" value={reliability.helpfulness}
                                        color={reliability.helpfulness >= 80 ? 'text-green-600' : 'text-yellow-600'} />
                                    <ScoreGauge label="Stability" value={reliability.stability}
                                        color={reliability.stability >= 80 ? 'text-green-600' : 'text-yellow-600'} />
                                </div>
                            </div>
                        </div>
                    )}

                    {history.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <TrendingUp size={18} className="text-gray-400" />
                                <p className="text-sm font-semibold">Historical Trend</p>
                            </div>
                            <div className="relative">
                                <div className="flex items-end gap-2 h-32">
                                    {history.map((h, idx) => {
                                        const height = Math.max(4, (h.overall_score || 0) * 100)
                                        const isLatest = idx === history.length - 1
                                        return (
                                            <div key={h.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                                                    {(h.overall_score * 100).toFixed(1)}% — v{h.prompt_version}
                                                    <br />{new Date(h.recorded_at).toLocaleDateString()}
                                                </div>
                                                <div
                                                    className={`w-full rounded-t-lg transition-all ${isLatest ? 'bg-black' : 'bg-gray-300 hover:bg-gray-400'}`}
                                                    style={{ height: `${height}%` }}
                                                />
                                                <span className="text-xs text-gray-400">v{h.prompt_version}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-gray-400">
                                    <span>0%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-3">
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className="text-lg font-bold">
                                        {(Math.max(...history.map(h => h.overall_score)) * 100).toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-gray-400">Best Score</p>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className="text-lg font-bold">
                                        {((history.reduce((s, h) => s + h.overall_score, 0) / history.length) * 100).toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-gray-400">Average</p>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className={`text-lg font-bold ${history.length > 1 && history[history.length - 1].overall_score > history[0].overall_score
                                            ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {history.length > 1
                                            ? `${((history[history.length - 1].overall_score - history[0].overall_score) * 100).toFixed(1)}%`
                                            : 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-400">Total Improvement</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {analytics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analytics.strengths.length > 0 && (
                                <div className="bg-white border border-green-200 rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <CheckCircle size={16} className="text-green-500" />
                                        <p className="text-sm font-semibold text-green-700">Strengths</p>
                                    </div>
                                    <div className="space-y-3">
                                        {analytics.strengths.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColors[s.type] || typeColors.unknown}`}>
                                                        {s.type.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{s.total} tests</span>
                                                </div>
                                                <span className="text-sm font-bold text-green-600">{s.avg_score}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analytics.weaknesses.length > 0 && (
                                <div className="bg-white border border-red-200 rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <XCircle size={16} className="text-red-500" />
                                        <p className="text-sm font-semibold text-red-700">Weaknesses</p>
                                    </div>
                                    <div className="space-y-3">
                                        {analytics.weaknesses.map((w, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColors[w.type] || typeColors.unknown}`}>
                                                        {w.type.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{w.total} tests</span>
                                                </div>
                                                <span className="text-sm font-bold text-red-600">{w.avg_score}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analytics.type_performance.length > 0 && (
                                <div className="bg-white border border-gray-200 rounded-xl p-5 md:col-span-2">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BarChart3 size={16} className="text-gray-400" />
                                        <p className="text-sm font-semibold">Performance by Scenario Type</p>
                                    </div>
                                    <div className="space-y-3">
                                        {analytics.type_performance.map((t, i) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize w-32 text-center ${typeColors[t.type] || typeColors.unknown}`}>
                                                    {t.type.replace('_', ' ')}
                                                </span>
                                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                    <div className={`h-2 rounded-full ${t.avg_score >= 80 ? 'bg-green-500' : t.avg_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`} style={{ width: `${t.avg_score}%` }} />
                                                </div>
                                                <span className={`text-sm font-semibold w-12 text-right ${t.avg_score >= 80 ? 'text-green-600' : t.avg_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>{t.avg_score}%</span>
                                                <span className="text-xs text-gray-400 w-16">{t.total} tests</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!reliability && !analytics && history.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <BarChart3 size={48} className="text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium">No analytics data yet</h3>
                            <p className="text-gray-500 text-sm mt-1">Run benchmarks to see historical trends and reliability scores</p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}