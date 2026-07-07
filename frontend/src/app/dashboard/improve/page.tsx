'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Sparkles, Loader2, CheckCircle, XCircle, TrendingUp, History, ChevronDown, ChevronUp, Bot, Play } from 'lucide-react'

interface Agent { id: string; name: string; system_prompt: string; model: string }
interface Run { id: string; status: string; overall_score: number | null; created_at: string }
interface Suggestion {
    id: string
    original_prompt: string
    suggested_prompt: string
    weaknesses_addressed: string[]
    expected_improvement: number
    applied: boolean
    created_at: string
}
interface PromptVersion {
    id: string
    version_number: number
    system_prompt: string
    benchmark_score: number | null
    improvements_applied: string[]
    created_at: string
}

export default function ImprovePage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [runs, setRuns] = useState<Run[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [selectedRun, setSelectedRun] = useState('')
    const [suggestions, setSuggestions] = useState<Suggestion[]>([])
    const [history, setHistory] = useState<PromptVersion[]>([])
    const [loading, setLoading] = useState(true)
    const [analyzing, setAnalyzing] = useState(false)
    const [applying, setApplying] = useState<string | null>(null)
    const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)
    const [expandedVersion, setExpandedVersion] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'suggestions' | 'history'>('suggestions')

    useEffect(() => {
        Promise.all([
            api.get<{ success: boolean; data: Agent[] }>('/api/agents'),
            api.get<{ success: boolean; data: Run[] }>('/api/runs')
        ]).then(([agentsRes, runsRes]) => {
            setAgents(agentsRes.data || [])
            setRuns((runsRes.data || []).filter(r => r.status === 'completed'))
        }).catch(console.error).finally(() => setLoading(false))
    }, [])

    const handleAgentChange = async (agent_id: string) => {
        setSelectedAgent(agent_id)
        setSelectedRun('')
        setSuggestions([])
        setHistory([])
        if (!agent_id) return
        try {
            const [sugRes, histRes] = await Promise.all([
                api.get<{ success: boolean; data: Suggestion[] }>(`/api/improve/suggestions/${agent_id}`),
                api.get<{ success: boolean; data: PromptVersion[] }>(`/api/improve/history/${agent_id}`)
            ])
            setSuggestions(sugRes.data || [])
            setHistory(histRes.data || [])
        } catch (err) { console.error(err) }
    }

    const handleAnalyze = async () => {
        if (!selectedAgent || !selectedRun) return
        setAnalyzing(true)
        try {
            await api.post('/api/improve/analyze', { agent_id: selectedAgent, run_id: selectedRun })
            const res = await api.get<{ success: boolean; data: Suggestion[] }>(`/api/improve/suggestions/${selectedAgent}`)
            setSuggestions(res.data || [])
            setActiveTab('suggestions')
        } catch (err) { console.error(err) } finally { setAnalyzing(false) }
    }

    const handleApply = async (suggestion_id: string) => {
        setApplying(suggestion_id)
        try {
            await api.post('/api/improve/apply', { suggestion_id })
            const [sugRes, histRes] = await Promise.all([
                api.get<{ success: boolean; data: Suggestion[] }>(`/api/improve/suggestions/${selectedAgent}`),
                api.get<{ success: boolean; data: PromptVersion[] }>(`/api/improve/history/${selectedAgent}`)
            ])
            setSuggestions(sugRes.data || [])
            setHistory(histRes.data || [])
        } catch (err) { console.error(err) } finally { setApplying(null) }
    }

    const scoreColor = (score: number) =>
        score >= 0.8 ? 'text-green-600' : score >= 0.6 ? 'text-yellow-600' : 'text-red-600'

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Auto Improve</h1>
                <p className="text-gray-500 text-sm mt-1">Analyze agent performance and get AI-powered prompt improvements</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold">Select Agent & Run to Analyze</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500">Agent</label>
                        <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                            <option value="">Choose an agent...</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500">Run to Analyze</label>
                        <select value={selectedRun} onChange={(e) => setSelectedRun(e.target.value)}
                            disabled={!selectedAgent}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50">
                            <option value="">Choose a completed run...</option>
                            {runs.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.id.slice(0, 8)}... — {r.overall_score ? `${(r.overall_score * 100).toFixed(1)}%` : 'N/A'} — {new Date(r.created_at).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <button onClick={handleAnalyze} disabled={analyzing || !selectedAgent || !selectedRun}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                    {analyzing ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><Sparkles size={14} /> Analyze & Generate Improvement</>}
                </button>
            </div>

            {selectedAgent && (
                <div className="space-y-4">
                    <div className="flex gap-2 border-b border-gray-200">
                        <button onClick={() => setActiveTab('suggestions')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === 'suggestions' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                            Suggestions ({suggestions.length})
                        </button>
                        <button onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === 'history' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                            Prompt History ({history.length})
                        </button>
                    </div>

                    {activeTab === 'suggestions' && (
                        <div className="space-y-3">
                            {suggestions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <Sparkles size={40} className="text-gray-200 mb-3" />
                                    <p className="text-sm font-medium text-gray-500">No suggestions yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Select a run and click Analyze to generate improvements</p>
                                </div>
                            ) : suggestions.map(s => (
                                <div key={s.id} className={`border rounded-xl overflow-hidden ${s.applied ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                                    <div className="p-4 flex items-center justify-between cursor-pointer"
                                        onClick={() => setExpandedSuggestion(expandedSuggestion === s.id ? null : s.id)}>
                                        <div className="flex items-center gap-3">
                                            {s.applied ? <CheckCircle size={16} className="text-green-500" /> : <Sparkles size={16} className="text-purple-500" />}
                                            <div>
                                                <p className="text-sm font-medium">{s.applied ? 'Applied Improvement' : 'Suggested Improvement'}</p>
                                                <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-sm font-semibold text-green-600">+{(s.expected_improvement * 100).toFixed(0)}%</p>
                                                <p className="text-xs text-gray-400">Expected</p>
                                            </div>
                                            {!s.applied && (
                                                <button onClick={(e) => { e.stopPropagation(); handleApply(s.id) }}
                                                    disabled={applying === s.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50">
                                                    {applying === s.id ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                                                    Apply
                                                </button>
                                            )}
                                            {expandedSuggestion === s.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </div>
                                    </div>

                                    {expandedSuggestion === s.id && (
                                        <div className="border-t border-gray-100 p-4 space-y-4">
                                            {s.weaknesses_addressed.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 mb-2">Weaknesses Addressed</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {s.weaknesses_addressed.map((w, i) => (
                                                            <span key={i} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">{w}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 mb-2">Original Prompt</p>
                                                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                                        {s.original_prompt}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 mb-2">Suggested Prompt</p>
                                                    <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                                        {s.suggested_prompt}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <History size={40} className="text-gray-200 mb-3" />
                                    <p className="text-sm font-medium text-gray-500">No prompt history yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Apply a suggestion to start tracking prompt versions</p>
                                </div>
                            ) : history.map((v, idx) => (
                                <div key={v.id} className={`border rounded-xl overflow-hidden ${idx === 0 ? 'border-green-200' : 'border-gray-200'}`}>
                                    <div className="p-4 flex items-center justify-between cursor-pointer"
                                        onClick={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                v{v.version_number}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Version {v.version_number} {idx === 0 ? '(Current)' : ''}</p>
                                                <p className="text-xs text-gray-400">{new Date(v.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {v.benchmark_score !== null && (
                                                <div className="text-center">
                                                    <p className={`text-sm font-bold ${scoreColor(v.benchmark_score)}`}>
                                                        {(v.benchmark_score * 100).toFixed(1)}%
                                                    </p>
                                                    <p className="text-xs text-gray-400">Score</p>
                                                </div>
                                            )}
                                            {expandedVersion === v.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </div>
                                    </div>

                                    {expandedVersion === v.id && (
                                        <div className="border-t border-gray-100 p-4 space-y-3">
                                            {v.improvements_applied.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 mb-2">Improvements Applied</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {v.improvements_applied.map((imp, i) => (
                                                            <span key={i} className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full">{imp}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">System Prompt</p>
                                                <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                                    {v.system_prompt}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}