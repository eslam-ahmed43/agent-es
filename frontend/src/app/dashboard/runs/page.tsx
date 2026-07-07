'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Play, CheckCircle, XCircle, Clock, Loader2, Plus, Bot, FlaskConical, ChevronDown, ChevronUp, Lightbulb, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react'

interface Evaluation {
    id: string
    scenario_id: string
    agent_response: string | null
    safety_score: number | null
    relevance_score: number | null
    overall_score: number | null
    passed: boolean | null
    failure_reason: string | null
    raw_response: {
        judge?: {
            strengths?: string[]
            weaknesses?: string[]
            suggestions?: string[]
            explanation?: string
            helpfulness?: number
            consistency?: number
        }
        strengths?: string[]
        weaknesses?: string[]
        suggestions?: string[]
        explanation?: string
    } | null
}

interface Run {
    id: string
    status: string
    total_scenarios: number
    completed_scenarios: number
    overall_score: number | null
    created_at: string
    evaluations?: Evaluation[]
}

interface Agent { id: string; name: string; project_id: string }
interface Scenario { id: string; name: string; type: string; agent_id: string; messages: any[] }

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
    running: { icon: Loader2, color: 'text-blue-500', label: 'Running' },
    completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
    failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' }
}

const typeColors: Record<string, string> = {
    persona: 'bg-blue-50 text-blue-600',
    edge_case: 'bg-yellow-50 text-yellow-600',
    attack: 'bg-red-50 text-red-600',
    long_conversation: 'bg-green-50 text-green-600'
}

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-xs">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium">{(value * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
                className={`h-1.5 rounded-full ${value >= 0.8 ? 'bg-green-500' : value >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${value * 100}%` }}
            />
        </div>
    </div>
)

export default function RunsPage() {
    const [runs, setRuns] = useState<Run[]>([])
    const [agents, setAgents] = useState<Agent[]>([])
    const [scenarios, setScenarios] = useState<Scenario[]>([])
    const [scenarioMap, setScenarioMap] = useState<Record<string, Scenario>>({})
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [starting, setStarting] = useState(false)
    const [replaying, setReplaying] = useState<string | null>(null)
    const [stopping, setStopping] = useState<string | null>(null)
    const [selectedAgent, setSelectedAgent] = useState('')
    const [selectedScenarios, setSelectedScenarios] = useState<string[]>([])
    const [expandedRun, setExpandedRun] = useState<string | null>(null)
    const [expandedEval, setExpandedEval] = useState<string | null>(null)

    const fetchData = async () => {
        try {
            const [runsRes, agentsRes] = await Promise.all([
                api.get<{ success: boolean; data: Run[] }>('/api/runs'),
                api.get<{ success: boolean; data: Agent[] }>('/api/agents')
            ])
            setRuns(runsRes.data || [])
            setAgents(agentsRes.data || [])
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    const fetchScenarios = async (agent_id: string) => {
        try {
            const res = await api.get<{ success: boolean; data: Scenario[] }>(`/api/scenarios?agent_id=${agent_id}`)
            setScenarios(res.data || [])
        } catch (err) { console.error(err) }
    }

    const fetchAllScenarios = async () => {
        try {
            const res = await api.get<{ success: boolean; data: Scenario[] }>('/api/scenarios')
            const map: Record<string, Scenario> = {}
            res.data?.forEach(s => { map[s.id] = s })
            setScenarioMap(map)
        } catch (err) { console.error(err) }
    }

    useEffect(() => { fetchData(); fetchAllScenarios() }, [])

    useEffect(() => {
        const hasRunning = runs.some(r => r.status === 'running' || r.status === 'pending')
        if (hasRunning) {
            const interval = setInterval(fetchData, 3000)
            return () => clearInterval(interval)
        }
    }, [runs])

    const handleAgentChange = (agent_id: string) => {
        setSelectedAgent(agent_id)
        setSelectedScenarios([])
        if (agent_id) fetchScenarios(agent_id)
    }

    const toggleScenario = (id: string) => {
        setSelectedScenarios(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
    }

    const handleStartRun = async () => {
        if (!selectedAgent || selectedScenarios.length === 0) return
        setStarting(true)
        try {
            const agent = agents.find(a => a.id === selectedAgent)
            await api.post('/api/execution/run', {
                agent_id: selectedAgent,
                project_id: agent?.project_id,
                scenario_ids: selectedScenarios
            })
            setShowModal(false)
            setSelectedAgent('')
            setSelectedScenarios([])
            fetchData()
        } catch (err) { console.error(err) } finally { setStarting(false) }
    }

    const handleReplay = async (run_id: string) => {
        setReplaying(run_id)
        try {
            await api.post('/api/execution/replay', { run_id })
            fetchData()
        } catch (err) { console.error(err) } finally { setReplaying(null) }
    }

    const handleStop = async (run_id: string) => {
        setStopping(run_id)
        try {
            await api.post(`/api/execution/run/${run_id}/stop`, {})
            fetchData()
        } catch (err) { console.error(err) } finally { setStopping(null) }
    }

    const fetchRunDetails = async (run_id: string) => {
        try {
            const res = await api.get<{ success: boolean; data: Run }>(`/api/execution/run/${run_id}`)
            setRuns(prev => prev.map(r => r.id === run_id ? res.data : r))
            setExpandedRun(run_id)
        } catch (err) { console.error(err) }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Runs</h1>
                    <p className="text-gray-500 text-sm mt-1">Execute and monitor agent test runs</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                    <Plus size={16} /> New Run
                </button>
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Play size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No runs yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Start a new run to test your agent</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {runs.map(run => {
                        const config = statusConfig[run.status] || statusConfig.pending
                        const Icon = config.icon
                        const progress = run.total_scenarios > 0 ? Math.round((run.completed_scenarios / run.total_scenarios) * 100) : 0
                        const isExpanded = expandedRun === run.id

                        return (
                            <div key={run.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-3 cursor-pointer flex-1"
                                        onClick={() => isExpanded ? setExpandedRun(null) : fetchRunDetails(run.id)}>
                                        <Icon size={18} className={`${config.color} ${run.status === 'running' ? 'animate-spin' : ''}`} />
                                        <div>
                                            <p className="font-medium text-sm">Run {run.id.slice(0, 8)}...</p>
                                            <p className="text-xs text-gray-400">{new Date(run.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-6 text-sm">
                                            <div className="text-center">
                                                <p className="font-semibold">{run.completed_scenarios}/{run.total_scenarios}</p>
                                                <p className="text-xs text-gray-400">Scenarios</p>
                                            </div>
                                            {run.overall_score !== null && (
                                                <div className="text-center">
                                                    <p className={`font-semibold ${run.overall_score >= 0.8 ? 'text-green-500' : run.overall_score >= 0.6 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                        {((run.overall_score || 0) * 100).toFixed(1)}%
                                                    </p>
                                                    <p className="text-xs text-gray-400">Score</p>
                                                </div>
                                            )}
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${run.status === 'completed' ? 'bg-green-50 text-green-600' :
                                                    run.status === 'running' ? 'bg-blue-50 text-blue-600' :
                                                        run.status === 'failed' ? 'bg-red-50 text-red-600' :
                                                            'bg-yellow-50 text-yellow-600'
                                                }`}>{config.label}</span>
                                        </div>
                                        {run.status === 'running' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleStop(run.id) }}
                                                disabled={stopping === run.id}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                                                {stopping === run.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                                                Stop
                                            </button>
                                        )}
                                        {run.status === 'completed' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleReplay(run.id) }}
                                                disabled={replaying === run.id}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
                                                {replaying === run.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                                Replay
                                            </button>
                                        )}
                                        <button onClick={() => isExpanded ? setExpandedRun(null) : fetchRunDetails(run.id)}
                                            className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {run.status === 'running' && (
                                    <div className="px-5 pb-3">
                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                            <div className="bg-black h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{progress}% complete</p>
                                    </div>
                                )}

                                {isExpanded && run.evaluations && (
                                    <div className="border-t border-gray-100 p-5 space-y-3">
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                                <p className="text-2xl font-bold text-green-600">{run.evaluations.filter(e => e.passed).length}</p>
                                                <p className="text-xs text-green-600">Passed</p>
                                            </div>
                                            <div className="text-center p-3 bg-red-50 rounded-lg">
                                                <p className="text-2xl font-bold text-red-600">{run.evaluations.filter(e => !e.passed).length}</p>
                                                <p className="text-xs text-red-600">Failed</p>
                                            </div>
                                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                                <p className="text-2xl font-bold text-blue-600">{((run.overall_score || 0) * 100).toFixed(0)}%</p>
                                                <p className="text-xs text-blue-600">Overall</p>
                                            </div>
                                        </div>

                                        {run.evaluations.map((ev, idx) => {
                                            const scenario = scenarioMap[ev.scenario_id]
                                            const isEvalExpanded = expandedEval === ev.id
                                            const judge = (ev.raw_response?.judge || ev.raw_response) as {
                                                strengths?: string[]
                                                weaknesses?: string[]
                                                suggestions?: string[]
                                                explanation?: string
                                                helpfulness?: number
                                                consistency?: number
                                            } | null

                                            return (
                                                <div key={ev.id} className={`border rounded-xl overflow-hidden ${ev.passed ? 'border-green-200' : 'border-red-200'}`}>
                                                    <div
                                                        className={`p-4 flex items-center justify-between cursor-pointer ${ev.passed ? 'bg-green-50' : 'bg-red-50'}`}
                                                        onClick={() => setExpandedEval(isEvalExpanded ? null : ev.id)}>
                                                        <div className="flex items-center gap-3">
                                                            {ev.passed
                                                                ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                                                                : <XCircle size={16} className="text-red-500 shrink-0" />}
                                                            <div>
                                                                <p className="text-sm font-medium">{scenario?.name || `Scenario ${idx + 1}`}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    {scenario?.type && (
                                                                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColors[scenario.type] || 'bg-gray-100 text-gray-600'}`}>
                                                                            {scenario.type.replace('_', ' ')}
                                                                        </span>
                                                                    )}
                                                                    <span className={`text-xs font-medium ${ev.passed ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {((ev.overall_score || 0) * 100).toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {!ev.passed && ev.failure_reason && (
                                                                <span className="text-xs text-red-500 max-w-xs truncate hidden md:block">{ev.failure_reason}</span>
                                                            )}
                                                            {isEvalExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </div>
                                                    </div>

                                                    {isEvalExpanded && (
                                                        <div className="p-4 space-y-4 bg-white">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                <ScoreBar label="Safety" value={ev.safety_score || 0} />
                                                                <ScoreBar label="Relevance" value={ev.relevance_score || 0} />
                                                                <ScoreBar label="Consistency" value={judge?.consistency || 0} />
                                                                <ScoreBar label="Helpfulness" value={judge?.helpfulness || 0} />
                                                            </div>

                                                            {judge?.explanation && (
                                                                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                                                                    {judge.explanation}
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {(judge?.strengths || []).length > 0 && (
                                                                    <div className="space-y-2">
                                                                        <p className="text-xs font-medium flex items-center gap-1 text-green-700">
                                                                            <ThumbsUp size={12} /> Strengths
                                                                        </p>
                                                                        <ul className="space-y-1">
                                                                            {(judge?.strengths || []).map((s: string, i: number) => (
                                                                                <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                                                                    <span className="text-green-500 mt-0.5">•</span> {s}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                {(judge?.weaknesses || []).length > 0 && (
                                                                    <div className="space-y-2">
                                                                        <p className="text-xs font-medium flex items-center gap-1 text-red-700">
                                                                            <ThumbsDown size={12} /> Weaknesses
                                                                        </p>
                                                                        <ul className="space-y-1">
                                                                            {(judge?.weaknesses || []).map((w: string, i: number) => (
                                                                                <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                                                                    <span className="text-red-500 mt-0.5">•</span> {w}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {(judge?.suggestions || []).length > 0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-medium flex items-center gap-1 text-blue-700">
                                                                        <Lightbulb size={12} /> Suggestions
                                                                    </p>
                                                                    <ul className="space-y-1">
                                                                        {(judge?.suggestions || []).map((s: string, i: number) => (
                                                                            <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                                                                <span className="text-blue-500 mt-0.5">•</span> {s}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}

                                                            {ev.agent_response && (
                                                                <div className="space-y-1">
                                                                    <p className="text-xs font-medium text-gray-500">Agent Response</p>
                                                                    <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 max-h-40 overflow-y-auto">
                                                                        {ev.agent_response}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-semibold">Start New Run</h2>
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2"><Bot size={14} /> Select Agent</label>
                            <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                                <option value="">Choose an agent...</option>
                                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        {selectedAgent && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium flex items-center gap-2"><FlaskConical size={14} /> Select Scenarios</label>
                                    <button onClick={() => setSelectedScenarios(
                                        selectedScenarios.length === scenarios.length ? [] : scenarios.map(s => s.id)
                                    )} className="text-xs text-blue-600 hover:underline">
                                        {selectedScenarios.length === scenarios.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                {scenarios.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">No scenarios found</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {scenarios.map(s => (
                                            <label key={s.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                                <input type="checkbox" checked={selectedScenarios.includes(s.id)}
                                                    onChange={() => toggleScenario(s.id)} className="rounded" />
                                                <div className="flex items-center gap-2 flex-1">
                                                    <p className="text-sm font-medium">{s.name}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColors[s.type] || 'bg-gray-100 text-gray-600'}`}>
                                                        {s.type.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {selectedScenarios.length > 0 && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                                {selectedScenarios.length} scenario(s) selected
                            </div>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleStartRun}
                                disabled={starting || !selectedAgent || selectedScenarios.length === 0}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
                                {starting ? <><Loader2 size={14} className="animate-spin" /> Starting...</> : <><Play size={14} /> Start Run</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}