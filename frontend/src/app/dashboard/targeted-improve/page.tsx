'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Target, Zap, CheckCircle, Loader2, TrendingUp, TrendingDown, ArrowRight, Sparkles } from 'lucide-react'

interface Agent { id: string; name: string }

interface Weakness {
    type: string
    avg_score: number
    pass_rate: number
    total: number
}

interface Analytics {
    type_performance: Weakness[]
    strengths: Weakness[]
    weaknesses: Weakness[]
}

interface Improvement {
    id: string
    weakness_type: string
    before_score: number
    after_score: number | null
    suggested_prompt: string
    original_prompt: string
    scenarios_analyzed: number
    applied: boolean
    created_at: string
}

const typeColors: Record<string, string> = {
    persona: 'bg-blue-100 text-blue-700',
    edge_case: 'bg-yellow-100 text-yellow-700',
    attack: 'bg-red-100 text-red-700',
    long_conversation: 'bg-green-100 text-green-700'
}

export default function TargetedImprovePage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [analytics, setAnalytics] = useState<Analytics | null>(null)
    const [improvements, setImprovements] = useState<Improvement[]>([])
    const [loading, setLoading] = useState(true)
    const [analyzing, setAnalyzing] = useState<string | null>(null)
    const [applying, setApplying] = useState<string | null>(null)
    const [verifying, setVerifying] = useState<string | null>(null)
    const [expandedImprovement, setExpandedImprovement] = useState<string | null>(null)
    const [lastResult, setLastResult] = useState<{ type: string; before: number; scenarios: number } | null>(null)

    const fetchAll = async (agent_id: string) => {
        try {
            const [anaRes, impRes] = await Promise.all([
                api.get<{ success: boolean; data: Analytics }>(`/api/analytics/performance/${agent_id}`),
                api.get<{ success: boolean; data: Improvement[] }>(`/api/targeted-improve/${agent_id}`)
            ])
            setAnalytics(anaRes.data || null)
            setImprovements(impRes.data || [])
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
        setLastResult(null)
        await fetchAll(agent_id)
    }

    const handleAnalyze = async (weakness_type: string) => {
        setAnalyzing(weakness_type)
        setLastResult(null)
        try {
            const res = await api.post<{ success: boolean; data: { improvement_id: string; before_score: number; scenarios_analyzed: number } }>(
                '/api/targeted-improve/analyze',
                { agent_id: selectedAgent, weakness_type }
            )
            setLastResult({
                type: weakness_type,
                before: res.data.before_score,
                scenarios: res.data.scenarios_analyzed
            })
            await fetchAll(selectedAgent)
        } catch (err) {
            console.error(err)
        } finally {
            setAnalyzing(null)
        }
    }

    const handleApply = async (improvement_id: string) => {
        setApplying(improvement_id)
        try {
            await api.post('/api/targeted-improve/apply', { improvement_id })
            await fetchAll(selectedAgent)
        } catch (err) {
            console.error(err)
        } finally {
            setApplying(null)
        }
    }

    const handleVerify = async (improvement_id: string) => {
        setVerifying(improvement_id)
        try {
            await api.post(`/api/targeted-improve/verify/${improvement_id}`, {})
            await fetchAll(selectedAgent)
        } catch (err) {
            console.error(err)
        } finally {
            setVerifying(null)
        }
    }

    const scoreColor = (score: number) =>
        score >= 0.8 ? 'text-green-600' : score >= 0.6 ? 'text-yellow-600' : 'text-red-600'

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Targeted Improve</h1>
                    <p className="text-gray-500 text-sm mt-1">Fix specific weaknesses instead of generic prompt tweaks</p>
                </div>
                <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700 font-medium">How it works</p>
                <p className="text-xs text-blue-600 mt-1">
                    Pick a weak scenario type below. The AI analyzes only the failed examples of that type and rewrites the prompt specifically to fix it, without touching what already works elsewhere.
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : (
                <>
                    {analytics && analytics.type_performance.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Target size={16} className="text-gray-400" />
                                <p className="text-sm font-semibold">Scenario Types — Pick a Weakness to Fix</p>
                            </div>
                            <div className="space-y-3">
                                {analytics.type_performance.map((t, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize w-32 text-center shrink-0 ${typeColors[t.type] || 'bg-gray-100 text-gray-600'}`}>
                                            {t.type.replace('_', ' ')}
                                        </span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                                            <div className={`h-2 rounded-full ${t.avg_score >= 80 ? 'bg-green-500' : t.avg_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`} style={{ width: `${t.avg_score}%` }} />
                                        </div>
                                        <span className={`text-sm font-semibold w-14 text-right ${t.avg_score >= 80 ? 'text-green-600' : t.avg_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>{t.avg_score}%</span>
                                        <span className="text-xs text-gray-400 w-16 shrink-0">{t.total} tests</span>
                                        <button
                                            onClick={() => handleAnalyze(t.type)}
                                            disabled={analyzing === t.type}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50 shrink-0">
                                            {analyzing === t.type ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            {analyzing === t.type ? 'Analyzing...' : 'Improve'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {lastResult && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                            <p className="text-sm text-green-700">
                                Generated a targeted fix for <span className="font-semibold capitalize">{lastResult.type.replace('_', ' ')}</span> based on {lastResult.scenarios} scenarios (current score: {(lastResult.before * 100).toFixed(1)}%). Review it below.
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {improvements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Zap size={40} className="text-gray-200 mb-3" />
                                <p className="text-sm font-medium text-gray-500">No targeted improvements yet</p>
                                <p className="text-xs text-gray-400 mt-1">Pick a weak scenario type above and click Improve</p>
                            </div>
                        ) : improvements.map(imp => {
                            const isExpanded = expandedImprovement === imp.id
                            const change = imp.after_score !== null ? imp.after_score - imp.before_score : null

                            return (
                                <div key={imp.id} className={`border rounded-xl overflow-hidden ${imp.applied ? 'border-green-200 bg-green-50/20' : 'border-gray-200'}`}>
                                    <div className="p-4 flex items-center justify-between cursor-pointer"
                                        onClick={() => setExpandedImprovement(isExpanded ? null : imp.id)}>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColors[imp.weakness_type] || 'bg-gray-100 text-gray-600'}`}>
                                                {imp.weakness_type.replace('_', ' ')}
                                            </span>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {imp.applied ? 'Applied' : 'Suggested'} Fix — based on {imp.scenarios_analyzed} scenarios
                                                </p>
                                                <p className="text-xs text-gray-400">{new Date(imp.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className={scoreColor(imp.before_score)}>{(imp.before_score * 100).toFixed(0)}%</span>
                                                {imp.after_score !== null && (
                                                    <>
                                                        <ArrowRight size={12} className="text-gray-400" />
                                                        <span className={scoreColor(imp.after_score)}>{(imp.after_score * 100).toFixed(0)}%</span>
                                                        {change !== null && (
                                                            <span className={`flex items-center gap-0.5 text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                                {change > 0 ? '+' : ''}{(change * 100).toFixed(1)}%
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            {!imp.applied ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleApply(imp.id) }}
                                                    disabled={applying === imp.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50">
                                                    {applying === imp.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                                    Apply
                                                </button>
                                            ) : imp.after_score === null ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleVerify(imp.id) }}
                                                    disabled={verifying === imp.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition disabled:opacity-50">
                                                    {verifying === imp.id ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                                                    Verify (run new scenarios first)
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">Original Prompt</p>
                                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-gray-600 max-h-48 overflow-y-auto whitespace-pre-wrap">
                                                    {imp.original_prompt}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">Suggested Prompt</p>
                                                <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-gray-600 max-h-48 overflow-y-auto whitespace-pre-wrap">
                                                    {imp.suggested_prompt}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}