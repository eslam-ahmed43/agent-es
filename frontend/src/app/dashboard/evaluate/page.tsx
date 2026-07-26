'use client'

import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import { Zap, CheckCircle, Loader2, BarChart3, Shield, Bot, TrendingUp, AlertTriangle, Star } from 'lucide-react'

interface Agent { id: string; name: string; model: string; type: string }
interface BenchmarkResult {
    name: string
    domain: string
    score: number
    passed: number
    failed: number
    total: number
}
interface FullEvaluation {
    id: string
    status: string
    overall_score: number
    benchmark_results: BenchmarkResult[]
    strengths: string[]
    weaknesses: string[]
    recommendation: string
    profile: {
        best_use_case: string
        reliability_tier: string
        key_capability: string
        main_risk: string
    }
    created_at: string
    completed_at: string
}

const domainIcons: Record<string, any> = {
    customer_support: Bot,
    coding: Zap,
    security: Shield,
    rag: BarChart3,
    default: TrendingUp
}

const tierColors: Record<string, string> = {
    enterprise: 'bg-green-100 text-green-700 border-green-200',
    professional: 'bg-blue-100 text-blue-700 border-blue-200',
    experimental: 'bg-yellow-100 text-yellow-700 border-yellow-200'
}

const scoreColor = (s: number) =>
    s >= 0.85 ? 'text-green-600' : s >= 0.70 ? 'text-yellow-600' : 'text-red-500'

const scoreBarColor = (s: number) =>
    s >= 0.85 ? 'bg-green-500' : s >= 0.70 ? 'bg-yellow-500' : 'bg-red-500'

export default function EvaluatePage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [running, setRunning] = useState(false)
    const [evaluation, setEvaluation] = useState<FullEvaluation | null>(null)
    const [pastEvaluations, setPastEvaluations] = useState<FullEvaluation[]>([])
    const [error, setError] = useState('')
    const pollRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        api.get<{ success: boolean; data: Agent[] }>('/api/agents')
            .then(res => {
                setAgents(res.data || [])
                if (res.data?.length > 0) {
                    setSelectedAgent(res.data[0].id)
                    loadPast(res.data[0].id)
                }
            }).catch(console.error)
        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [])

    const loadPast = async (agent_id: string) => {
        try {
            const res = await api.get<{ success: boolean; data: FullEvaluation[] }>(`/api/evaluate/agent/${agent_id}`)
            setPastEvaluations(res.data || [])
            const latest = res.data?.[0]
            if (latest && latest.status === 'completed') setEvaluation(latest)
        } catch { }
    }

    const handleAgentChange = (id: string) => {
        setSelectedAgent(id)
        setEvaluation(null)
        loadPast(id)
    }

    const pollEvaluation = (evaluation_id: string) => {
        pollRef.current = setInterval(async () => {
            try {
                const res = await api.get<{ success: boolean; data: FullEvaluation }>(`/api/evaluate/${evaluation_id}`)
                const ev = res.data
                setEvaluation(ev)
                if (ev?.status === 'completed' || ev?.status === 'failed') {
                    clearInterval(pollRef.current!)
                    setRunning(false)
                    loadPast(selectedAgent)
                }
            } catch { }
        }, 3000)
    }

    const handleStart = async () => {
        setRunning(true)
        setError('')
        setEvaluation(null)
        try {
            const res = await api.post<{ success: boolean; data: { evaluation_id: string } }>(
                '/api/evaluate/start', { agent_id: selectedAgent }
            )
            const evaluation_id = res.data.evaluation_id
            pollEvaluation(evaluation_id)
        } catch (err: any) {
            setError(err.message || 'Failed to start evaluation')
            setRunning(false)
        }
    }

    const completedBenchmarks = evaluation?.benchmark_results?.length || 0
    const totalBenchmarks = 4

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Full Evaluation</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Test your agent across all benchmarks and get a complete profile</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white">
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={handleStart} disabled={running || !selectedAgent}
                        className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                        {running ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                        {running ? 'Evaluating...' : 'Run Full Evaluation'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
            )}

            {running && evaluation && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <Loader2 size={16} className="animate-spin text-black" />
                        <p className="text-sm font-medium">Running evaluation... {completedBenchmarks}/{totalBenchmarks} benchmarks</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-black h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(completedBenchmarks / totalBenchmarks) * 100}%` }} />
                    </div>
                    {evaluation.benchmark_results?.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {evaluation.benchmark_results.map((r, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                                    <span className="text-gray-700">{r.name}</span>
                                    <span className={`ml-auto font-bold ${scoreColor(r.score)}`}>{(r.score * 100).toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!running && !evaluation && !error && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <Zap size={28} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No evaluation yet</h3>
                    <p className="text-gray-500 text-sm mb-6 max-w-sm">
                        Run a Full Evaluation to test your agent across all benchmarks and get a complete capability profile.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs text-gray-500">
                        {['Customer Support', 'Coding', 'Security', 'RAG'].map((b, i) => (
                            <div key={i} className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                                <p className="font-medium text-gray-700">{b}</p>
                                <p className="mt-0.5">Benchmark</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {evaluation?.status === 'completed' && (
                <>
                    <div className="bg-black text-white rounded-2xl p-6">
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Overall Score</p>
                                <p className={`text-6xl font-bold ${evaluation.overall_score >= 0.85 ? 'text-green-400' : evaluation.overall_score >= 0.70 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {(evaluation.overall_score * 100).toFixed(1)}%
                                </p>
                            </div>
                            {evaluation.profile?.reliability_tier && (
                                <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${tierColors[evaluation.profile.reliability_tier] || tierColors.experimental}`}>
                                    {evaluation.profile.reliability_tier}
                                </span>
                            )}
                        </div>

                        {evaluation.recommendation && (
                            <div className="bg-white/5 rounded-xl p-4 mb-5">
                                <p className="text-xs text-gray-400 mb-1">Recommendation</p>
                                <p className="text-sm text-gray-200">{evaluation.recommendation}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {evaluation.benchmark_results.map((r, i) => {
                                const Icon = domainIcons[r.domain] || domainIcons.default
                                return (
                                    <div key={i} className="bg-white/5 rounded-xl p-3">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Icon size={12} className="text-gray-400" />
                                            <p className="text-xs text-gray-400 truncate">{r.name.replace(' Benchmark', '').replace(' Agent', '')}</p>
                                        </div>
                                        <p className={`text-xl font-bold ${scoreColor(r.score)}`}>{(r.score * 100).toFixed(1)}%</p>
                                        <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                                            <div className={`h-1.5 rounded-full ${scoreBarColor(r.score)}`} style={{ width: `${r.score * 100}%` }} />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{r.passed}/{r.total} passed</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {evaluation.strengths.length > 0 && (
                            <div className="bg-white border border-gray-100 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                                        <CheckCircle size={13} className="text-green-600" />
                                    </div>
                                    <p className="text-sm font-semibold">Strengths</p>
                                </div>
                                <div className="space-y-2">
                                    {evaluation.strengths.map((s, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                            <Star size={13} className="text-green-500 shrink-0 mt-0.5" />
                                            <p>{s}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {evaluation.weaknesses.length > 0 && (
                            <div className="bg-white border border-gray-100 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
                                        <AlertTriangle size={13} className="text-red-500" />
                                    </div>
                                    <p className="text-sm font-semibold">Weaknesses</p>
                                </div>
                                <div className="space-y-2">
                                    {evaluation.weaknesses.map((w, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                            <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                                            <p>{w}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {evaluation.profile && (
                        <div className="bg-white border border-gray-100 rounded-xl p-5">
                            <p className="text-sm font-semibold mb-4">Agent Profile</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Best Use Case', value: evaluation.profile.best_use_case },
                                    { label: 'Key Capability', value: evaluation.profile.key_capability },
                                    { label: 'Reliability Tier', value: evaluation.profile.reliability_tier },
                                    { label: 'Main Risk', value: evaluation.profile.main_risk },
                                ].map((item, i) => (
                                    <div key={i} className="p-3 bg-gray-50 rounded-xl">
                                        <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                                        <p className="text-sm font-medium capitalize">{item.value || 'N/A'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {pastEvaluations.length > 1 && (
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                    <p className="text-sm font-semibold mb-3">Previous Evaluations</p>
                    <div className="space-y-2">
                        {pastEvaluations.slice(1).map((ev, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition"
                                onClick={() => setEvaluation(ev)}>
                                <p className="text-xs text-gray-500">{new Date(ev.created_at).toLocaleDateString()}</p>
                                <span className={`text-sm font-bold ${scoreColor(ev.overall_score)}`}>
                                    {(ev.overall_score * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}