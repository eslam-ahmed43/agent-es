'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { FileText, Download, Loader2, CheckCircle, Shield, BarChart3, GitBranch, Sparkles, TrendingUp, XCircle, Clock } from 'lucide-react'

interface Agent { id: string; name: string; model: string; type: string }
interface ReportSummary {
    total_runs: number
    avg_score: number
    passed_scenarios: number
    failed_scenarios: number
    top_failure_reason: string | null
}
interface Run {
    id: string
    status: string
    total_scenarios: number
    completed_scenarios: number
    overall_score: number | null
    created_at: string
}

export default function ReportsPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [summary, setSummary] = useState<ReportSummary | null>(null)
    const [runs, setRuns] = useState<Run[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [agentsRes, summaryRes, runsRes] = await Promise.all([
                    api.get<{ success: boolean; data: Agent[] }>('/api/agents'),
                    api.get<{ success: boolean; data: ReportSummary }>('/api/reports/summary'),
                    api.get<{ success: boolean; data: Run[] }>('/api/runs')
                ])
                setAgents(agentsRes.data || [])
                if (agentsRes.data?.length > 0) setSelectedAgent(agentsRes.data[0].id)
                setSummary(summaryRes.data)
                setRuns(runsRes.data || [])
            } catch {
                setSummary({ total_runs: 0, avg_score: 0, passed_scenarios: 0, failed_scenarios: 0, top_failure_reason: null })
            } finally { setLoading(false) }
        }
        fetchAll()
    }, [])

    const handleDownload = async () => {
        if (!selectedAgent) return
        setGenerating(true)
        setSuccess(false)
        try {
            const { createBrowserClient } = await import('@supabase/ssr')
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token || ''

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/reports/reliability/${selectedAgent}`,
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            )

            if (!res.ok) throw new Error('Failed to generate report')

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `reliability-report-${new Date().toISOString().slice(0, 10)}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        } catch (err) {
            console.error(err)
        } finally { setGenerating(false) }
    }

    const scoreColor = (s: number) => s >= 0.8 ? 'text-green-500' : s >= 0.6 ? 'text-yellow-500' : 'text-red-500'
    const scoreBg = (s: number) => s >= 0.8 ? 'bg-green-50 border-green-200' : s >= 0.6 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
    const passRate = summary && (summary.passed_scenarios + summary.failed_scenarios) > 0
        ? (summary.passed_scenarios / (summary.passed_scenarios + summary.failed_scenarios) * 100).toFixed(1)
        : '0'

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Reports</h1>
                <p className="text-gray-500 text-sm mt-1">Overview of your agent performance and downloadable PDF reports</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-black rounded-xl">
                        <FileText size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-semibold">AI Reliability Report</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            A comprehensive PDF covering Reliability Score, Benchmark Results, Strengths & Weaknesses, Recommendations, Regression Status, and Version History.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { icon: Shield, label: 'Reliability Score', desc: 'Composite score with breakdown' },
                        { icon: BarChart3, label: 'Benchmark Results', desc: 'Score on each benchmark' },
                        { icon: Sparkles, label: 'Recommendations', desc: 'AI-powered action items' },
                        { icon: GitBranch, label: 'Regression Status', desc: 'Latest regression check' }
                    ].map(({ icon: Icon, label, desc }, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                            <Icon size={16} className="text-gray-400 mb-2" />
                            <p className="text-xs font-medium">{label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Select Agent</label>
                    <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.model || a.type})</option>)}
                    </select>
                </div>

                <button onClick={handleDownload} disabled={generating || loading || !selectedAgent}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 w-full justify-center">
                    {generating ? <><Loader2 size={16} className="animate-spin" /> Generating PDF...</>
                        : success ? <><CheckCircle size={16} className="text-green-400" /> Downloaded!</>
                            : <><Download size={16} /> Download Reliability Report</>}
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : summary ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 size={16} className="text-gray-400" />
                                <p className="text-sm text-gray-500">Total Runs</p>
                            </div>
                            <p className="text-3xl font-bold">{summary.total_runs}</p>
                        </div>
                        <div className={`border rounded-xl p-5 ${scoreBg(summary.avg_score)}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={16} className="text-gray-400" />
                                <p className="text-sm text-gray-500">Avg Score</p>
                            </div>
                            <p className={`text-3xl font-bold ${scoreColor(summary.avg_score)}`}>
                                {(summary.avg_score * 100).toFixed(1)}%
                            </p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle size={16} className="text-green-400" />
                                <p className="text-sm text-gray-500">Pass Rate</p>
                            </div>
                            <p className="text-3xl font-bold text-green-500">{passRate}%</p>
                            <p className="text-xs text-gray-400 mt-1">{summary.passed_scenarios} passed / {summary.failed_scenarios} failed</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <XCircle size={16} className="text-red-400" />
                                <p className="text-sm text-gray-500">Failed</p>
                            </div>
                            <p className="text-3xl font-bold text-red-500">{summary.failed_scenarios}</p>
                        </div>
                    </div>

                    {summary.top_failure_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                            <p className="text-sm font-medium text-red-700 mb-1">Top Failure Reason</p>
                            <p className="text-sm text-red-600">{summary.top_failure_reason}</p>
                        </div>
                    )}

                    {runs.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-sm font-medium mb-4">Recent Runs</p>
                            <div className="space-y-3">
                                {runs.slice(0, 5).map(run => (
                                    <div key={run.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {run.status === 'completed' ? <CheckCircle size={14} className="text-green-500" /> :
                                                run.status === 'failed' ? <XCircle size={14} className="text-red-500" /> :
                                                    <Clock size={14} className="text-yellow-500" />}
                                            <div>
                                                <p className="text-xs font-medium">Run {run.id.slice(0, 8)}...</p>
                                                <p className="text-xs text-gray-400">{new Date(run.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs">
                                            <span className="text-gray-500">{run.completed_scenarios}/{run.total_scenarios} scenarios</span>
                                            {run.overall_score !== null && (
                                                <span className={`font-medium ${scoreColor(run.overall_score || 0)}`}>
                                                    {((run.overall_score || 0) * 100).toFixed(1)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : null}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700 font-medium">Enterprise Use</p>
                <p className="text-xs text-blue-600 mt-1">
                    Share this report with your team, investors, or clients as proof of your AI agent's reliability and continuous improvement.
                </p>
            </div>
        </div>
    )
}