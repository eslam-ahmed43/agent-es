'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { DollarSign, Loader2, RefreshCw, TrendingUp, Clock, Zap, BarChart3 } from 'lucide-react'

interface Agent { id: string; name: string }
interface CostRecord {
    id: string
    run_id: string
    total_tokens: number
    prompt_tokens: number
    completion_tokens: number
    estimated_cost_usd: number
    avg_latency_ms: number
    model: string
    scenario_count: number
    overall_score: number | null
    cost_per_scenario: number
    created_at: string
}
interface CostSummary {
    total_runs: number
    total_cost_usd: number
    total_tokens: number
    avg_cost_per_run: number
    avg_latency_ms: number
    avg_score: number | null
    estimated_monthly_cost: number
    cost_efficiency: number | null
}

export default function CostAnalyticsPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [records, setRecords] = useState<CostRecord[]>([])
    const [summary, setSummary] = useState<CostSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [computing, setComputing] = useState(false)

    const fetchAll = async (agent_id: string) => {
        try {
            const [recordsRes, summaryRes] = await Promise.all([
                api.get<{ success: boolean; data: CostRecord[] }>(`/api/cost-analytics/${agent_id}`),
                api.get<{ success: boolean; data: CostSummary }>(`/api/cost-analytics/summary/${agent_id}`)
            ])
            setRecords(recordsRes.data || [])
            setSummary(summaryRes.data || null)
        } catch (err) { console.error(err) }
    }

    useEffect(() => {
        api.get<{ success: boolean; data: Agent[] }>('/api/agents')
            .then(async res => {
                setAgents(res.data || [])
                if (res.data?.length > 0) {
                    setSelectedAgent(res.data[0].id)
                    await fetchAll(res.data[0].id)
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleAgentChange = async (agent_id: string) => {
        setSelectedAgent(agent_id)
        setLoading(true)
        await fetchAll(agent_id)
        setLoading(false)
    }

    const handleCompute = async () => {
        setComputing(true)
        try {
            await api.post('/api/cost-analytics/compute', { agent_id: selectedAgent })
            await fetchAll(selectedAgent)
        } catch (err) { console.error(err) } finally { setComputing(false) }
    }

    const formatCost = (cost: number) =>
        cost < 0.001 ? `$${(cost * 1000).toFixed(3)}m` : `$${cost.toFixed(4)}`

    const formatTokens = (tokens: number) =>
        tokens > 1000 ? `${(tokens / 1000).toFixed(1)}K` : tokens.toString()

    const scoreColor = (s: number) =>
        s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600'

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Cost Analytics</h1>
                    <p className="text-gray-500 text-sm mt-1">Track tokens, latency, and estimated cost per run</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={handleCompute} disabled={computing}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                        {computing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        {computing ? 'Computing...' : 'Compute Costs'}
                    </button>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700 font-medium">How it works</p>
                <p className="text-xs text-blue-600 mt-1">
                    Click "Compute Costs" to analyze all completed runs and estimate token usage and cost based on the model's pricing. Costs are estimates based on public pricing data.
                </p>
            </div>

            {summary && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-black text-white rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign size={16} className="text-gray-400" />
                                <p className="text-xs text-gray-400">Total Spent</p>
                            </div>
                            <p className="text-2xl font-bold">{formatCost(summary.total_cost_usd)}</p>
                            <p className="text-xs text-gray-500 mt-1">{summary.total_runs} runs</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap size={16} className="text-gray-400" />
                                <p className="text-xs text-gray-400">Avg Cost/Run</p>
                            </div>
                            <p className="text-2xl font-bold">{formatCost(summary.avg_cost_per_run)}</p>
                            <p className="text-xs text-gray-400 mt-1">per benchmark run</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={16} className="text-gray-400" />
                                <p className="text-xs text-gray-400">Avg Latency</p>
                            </div>
                            <p className="text-2xl font-bold">
                                {summary.avg_latency_ms > 0 ? `${(summary.avg_latency_ms / 1000).toFixed(1)}s` : 'N/A'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">per scenario</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 size={16} className="text-gray-400" />
                                <p className="text-xs text-gray-400">Total Tokens</p>
                            </div>
                            <p className="text-2xl font-bold">{formatTokens(summary.total_tokens)}</p>
                            <p className="text-xs text-gray-400 mt-1">all runs combined</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-xs text-gray-400 mb-1">Est. Monthly Cost</p>
                            <p className="text-3xl font-bold text-orange-600">${summary.estimated_monthly_cost}</p>
                            <p className="text-xs text-gray-400 mt-1">Based on 30 runs/month estimate</p>
                        </div>
                        {summary.avg_score !== null && (
                            <div className="bg-white border border-gray-200 rounded-xl p-5">
                                <p className="text-xs text-gray-400 mb-1">Avg Quality Score</p>
                                <p className={`text-3xl font-bold ${scoreColor(summary.avg_score)}`}>{summary.avg_score}%</p>
                                <p className="text-xs text-gray-400 mt-1">across all runs</p>
                            </div>
                        )}
                        {summary.cost_efficiency !== null && (
                            <div className="bg-white border border-gray-200 rounded-xl p-5">
                                <p className="text-xs text-gray-400 mb-1">Cost Efficiency</p>
                                <p className="text-3xl font-bold text-purple-600">{summary.cost_efficiency}</p>
                                <p className="text-xs text-gray-400 mt-1">Quality per $0.001 spent</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <DollarSign size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No cost data yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Click "Compute Costs" to analyze your runs</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <p className="text-sm font-semibold">Run Cost Breakdown</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 text-xs text-gray-500">
                                    <th className="text-left px-4 py-3">Run</th>
                                    <th className="text-center px-4 py-3">Scenarios</th>
                                    <th className="text-center px-4 py-3">Tokens</th>
                                    <th className="text-center px-4 py-3">Cost</th>
                                    <th className="text-center px-4 py-3">Cost/Scenario</th>
                                    <th className="text-center px-4 py-3">Latency</th>
                                    <th className="text-center px-4 py-3">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {records.map(record => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <p className="text-xs font-medium">{record.run_id.slice(0, 8)}...</p>
                                            <p className="text-xs text-gray-400">{new Date(record.created_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">{record.scenario_count}</td>
                                        <td className="px-4 py-3 text-center">
                                            <p className="text-sm font-medium">{formatTokens(record.total_tokens)}</p>
                                            <p className="text-xs text-gray-400">{formatTokens(record.prompt_tokens)}↑ {formatTokens(record.completion_tokens)}↓</p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <p className="text-sm font-medium text-orange-600">{formatCost(record.estimated_cost_usd)}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-gray-500">
                                            {formatCost(record.cost_per_scenario)}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            {record.avg_latency_ms > 0 ? `${(record.avg_latency_ms / 1000).toFixed(1)}s` : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {record.overall_score !== null ? (
                                                <span className={`text-sm font-bold ${scoreColor((record.overall_score || 0) * 100)}`}>
                                                    {((record.overall_score || 0) * 100).toFixed(1)}%
                                                </span>
                                            ) : <span className="text-xs text-gray-400">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}