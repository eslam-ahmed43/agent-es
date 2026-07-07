'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { GitBranch, Play, CheckCircle, XCircle, AlertTriangle, Loader2, TrendingUp, TrendingDown, Minus, StopCircle } from 'lucide-react'

interface RegressionResult {
    benchmark_name: string
    domain: string
    current_score: number | null
    previous_score: number | null
    score_change: number | null
    is_regression: boolean
    passed_threshold: boolean
    status: string
    sample_size?: number
}

interface RegressionRun {
    id: string
    status: string
    results: RegressionResult[]
    overall_regression: boolean
    triggered_by: string
    created_at: string
    completed_at: string | null
}

interface Agent { id: string; name: string }

export default function RegressionPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [runs, setRuns] = useState<RegressionRun[]>([])
    const [loading, setLoading] = useState(true)
    const [starting, setStarting] = useState(false)
    const [stopping, setStopping] = useState<string | null>(null)
    const [expandedRun, setExpandedRun] = useState<string | null>(null)

    const fetchAgents = async () => {
        try {
            const res = await api.get<{ success: boolean; data: Agent[] }>('/api/agents')
            setAgents(res.data || [])
            if (res.data?.length > 0) {
                setSelectedAgent(res.data[0].id)
                await fetchRuns(res.data[0].id)
            }
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    const fetchRuns = async (agent_id: string) => {
        try {
            const res = await api.get<{ success: boolean; data: RegressionRun[] }>(`/api/regression/${agent_id}`)
            setRuns(res.data || [])
        } catch (err) { console.error(err) }
    }

    useEffect(() => { fetchAgents() }, [])

    useEffect(() => {
        const hasRunning = runs.some(r => r.status === 'running')
        if (!hasRunning) return
        const interval = setInterval(() => fetchRuns(selectedAgent), 15000)
        return () => clearInterval(interval)
    }, [runs, selectedAgent])

    const handleStart = async () => {
        if (!selectedAgent) return
        setStarting(true)
        try {
            await api.post('/api/regression/start', { agent_id: selectedAgent })
            await fetchRuns(selectedAgent)
        } catch (err) { console.error(err) } finally { setStarting(false) }
    }

    const handleStop = async (id: string) => {
        setStopping(id)
        try {
            await api.post(`/api/regression/${id}/stop`, {})
            await fetchRuns(selectedAgent)
        } catch (err) { console.error(err) } finally { setStopping(null) }
    }

    const handleAgentChange = async (agent_id: string) => {
        setSelectedAgent(agent_id)
        setRuns([])
        await fetchRuns(agent_id)
    }

    const getScoreColor = (score: number) =>
        score >= 0.8 ? 'text-green-600' : score >= 0.6 ? 'text-yellow-600' : 'text-red-600'

    const getChangeIcon = (change: number | null) => {
        if (change === null) return <Minus size={14} className="text-gray-400" />
        if (change > 0.02) return <TrendingUp size={14} className="text-green-500" />
        if (change < -0.02) return <TrendingDown size={14} className="text-red-500" />
        return <Minus size={14} className="text-gray-400" />
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Regression Suite</h1>
                    <p className="text-gray-500 text-sm mt-1">Ensure improvements don't break existing benchmarks</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={handleStart} disabled={starting || !selectedAgent || runs.some(r => r.status === 'running')}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                        {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        {starting ? 'Starting...' : 'Run Regression'}
                    </button>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700 font-medium">How it works</p>
                <p className="text-xs text-blue-600 mt-1">
                    Runs a sample of 5 scenarios from each official benchmark and checks if scores dropped by more than 5%. Fast regression check — takes ~5 minutes.
                </p>
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <GitBranch size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No regression runs yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Run a regression suite to check for regressions across all benchmarks</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {runs.map(run => (
                        <div key={run.id} className={`bg-white border rounded-xl overflow-hidden ${run.status === 'running' ? 'border-blue-300' :
                                run.overall_regression ? 'border-red-300' :
                                    run.status === 'completed' ? 'border-green-300' : 'border-gray-200'
                            }`}>
                            <div className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-3 cursor-pointer flex-1"
                                    onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}>
                                    {run.status === 'running' ? (
                                        <Loader2 size={18} className="text-blue-500 animate-spin" />
                                    ) : run.overall_regression ? (
                                        <AlertTriangle size={18} className="text-red-500" />
                                    ) : run.status === 'completed' ? (
                                        <CheckCircle size={18} className="text-green-500" />
                                    ) : (
                                        <XCircle size={18} className="text-red-500" />
                                    )}
                                    <div>
                                        <p className="font-medium text-sm">Regression Run — {new Date(run.created_at).toLocaleString()}</p>
                                        <p className="text-xs text-gray-400">
                                            {run.triggered_by} • {run.results?.length || 0} benchmarks tested
                                            {run.completed_at && ` • ${Math.round((new Date(run.completed_at).getTime() - new Date(run.created_at).getTime()) / 60000)}m`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {run.status === 'running' ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full animate-pulse">Running...</span>
                                            <button
                                                onClick={() => handleStop(run.id)}
                                                disabled={stopping === run.id}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                                                {stopping === run.id ? <Loader2 size={12} className="animate-spin" /> : <StopCircle size={12} />}
                                                Stop
                                            </button>
                                        </div>
                                    ) : run.overall_regression ? (
                                        <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-full">⚠️ Regression Detected</span>
                                    ) : run.status === 'completed' ? (
                                        <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded-full">✅ All Clear</span>
                                    ) : (
                                        <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-full">Failed</span>
                                    )}
                                </div>
                            </div>

                            {expandedRun === run.id && run.results && run.results.length > 0 && (
                                <div className="border-t border-gray-100">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 text-xs text-gray-500">
                                                <th className="text-left px-5 py-3">Benchmark</th>
                                                <th className="text-center px-4 py-3">Sample</th>
                                                <th className="text-center px-4 py-3">Previous</th>
                                                <th className="text-center px-4 py-3">Current</th>
                                                <th className="text-center px-4 py-3">Change</th>
                                                <th className="text-center px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {run.results.map((result, idx) => (
                                                <tr key={idx} className={result.is_regression ? 'bg-red-50/50' : ''}>
                                                    <td className="px-5 py-3">
                                                        <p className="text-sm font-medium">{result.benchmark_name}</p>
                                                        <p className="text-xs text-gray-400 capitalize">{result.domain}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-xs text-gray-500">{result.sample_size || 5} scenarios</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {result.previous_score !== null ? (
                                                            <span className={`text-sm font-medium ${getScoreColor(result.previous_score)}`}>
                                                                {(result.previous_score * 100).toFixed(1)}%
                                                            </span>
                                                        ) : <span className="text-xs text-gray-400">N/A</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {result.current_score !== null ? (
                                                            <span className={`text-sm font-bold ${getScoreColor(result.current_score)}`}>
                                                                {(result.current_score * 100).toFixed(1)}%
                                                            </span>
                                                        ) : <span className="text-xs text-gray-400">N/A</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {getChangeIcon(result.score_change)}
                                                            {result.score_change !== null && (
                                                                <span className={`text-xs font-medium ${result.score_change > 0.02 ? 'text-green-600' :
                                                                        result.score_change < -0.02 ? 'text-red-600' : 'text-gray-500'
                                                                    }`}>
                                                                    {result.score_change > 0 ? '+' : ''}{(result.score_change * 100).toFixed(1)}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {result.status === 'skipped' ? (
                                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Skipped</span>
                                                        ) : result.is_regression ? (
                                                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">⚠️ Regression</span>
                                                        ) : result.passed_threshold ? (
                                                            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">✅ Passed</span>
                                                        ) : (
                                                            <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full">Below Threshold</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}