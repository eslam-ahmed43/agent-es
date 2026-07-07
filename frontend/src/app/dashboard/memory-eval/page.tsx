'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Brain, Play, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Zap } from 'lucide-react'

interface Agent { id: string; name: string }
interface MemoryTest {
    id: string
    name: string
    description: string
    test_type: string
    difficulty: string
    expected_recall: string[]
    conversation_turns: { role: string; content: string }[]
}
interface MemoryResult {
    id: string
    recall_score: number
    consistency_score: number
    context_retention: number
    overall_score: number
    passed: boolean
    created_at: string
    details: {
        final_response: string
        expected_recall: string[]
        recalled: string[]
        missed: string[]
        judge_explanation: string
    }
    memory_tests: { name: string; test_type: string; difficulty: string }
}
interface Summary {
    total_tests: number
    avg_recall: number
    avg_consistency: number
    avg_retention: number
    overall_memory_score: number
    passed_count: number
    failed_count: number
}

const diffColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-orange-100 text-orange-700',
    expert: 'bg-red-100 text-red-700'
}

const typeColors: Record<string, string> = {
    recall: 'bg-blue-100 text-blue-700',
    retention: 'bg-purple-100 text-purple-700',
    preference: 'bg-pink-100 text-pink-700',
    multi_recall: 'bg-indigo-100 text-indigo-700',
    context_shift: 'bg-orange-100 text-orange-700',
    needle: 'bg-red-100 text-red-700'
}

export default function MemoryEvalPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [tests, setTests] = useState<MemoryTest[]>([])
    const [results, setResults] = useState<MemoryResult[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [loading, setLoading] = useState(true)
    const [seeding, setSeeding] = useState(false)
    const [running, setRunning] = useState<string | null>(null)
    const [expandedResult, setExpandedResult] = useState<string | null>(null)

    const fetchAll = async (agent_id: string) => {
        try {
            const [testsRes, resultsRes, summaryRes] = await Promise.all([
                api.get<{ success: boolean; data: MemoryTest[] }>(`/api/memory-eval/${agent_id}`),
                api.get<{ success: boolean; data: MemoryResult[] }>(`/api/memory-eval/results/${agent_id}`),
                api.get<{ success: boolean; data: Summary }>(`/api/memory-eval/summary/${agent_id}`)
            ])
            setTests(testsRes.data || [])
            setResults(resultsRes.data || [])
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

    const handleSeed = async () => {
        setSeeding(true)
        try {
            await api.post('/api/memory-eval/seed', { agent_id: selectedAgent })
            await fetchAll(selectedAgent)
        } catch (err) { console.error(err) } finally { setSeeding(false) }
    }

    const handleRun = async (test_id: string) => {
        setRunning(test_id)
        try {
            await api.post('/api/memory-eval/run', { memory_test_id: test_id, agent_id: selectedAgent })
            await fetchAll(selectedAgent)
        } catch (err) { console.error(err) } finally { setRunning(null) }
    }

    const scoreColor = (s: number) =>
        s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600'

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Memory Evaluation</h1>
                    <p className="text-gray-500 text-sm mt-1">Test how well your agent remembers information across conversations</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={handleSeed} disabled={seeding || tests.length > 0}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">
                        {seeding ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                        {seeding ? 'Loading...' : tests.length > 0 ? `${tests.length} Tests Ready` : 'Load Memory Tests'}
                    </button>
                </div>
            </div>

            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-black text-white rounded-xl p-5">
                        <p className="text-xs text-gray-400 mb-1">Memory Score</p>
                        <p className="text-3xl font-bold">{summary.overall_memory_score}%</p>
                        <p className="text-xs text-gray-500 mt-1">{summary.total_tests} tests</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <p className="text-xs text-gray-400 mb-1">Recall</p>
                        <p className={`text-2xl font-bold ${scoreColor(summary.avg_recall)}`}>{summary.avg_recall}%</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <p className="text-xs text-gray-400 mb-1">Consistency</p>
                        <p className={`text-2xl font-bold ${scoreColor(summary.avg_consistency)}`}>{summary.avg_consistency}%</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <p className="text-xs text-gray-400 mb-1">Pass Rate</p>
                        <p className="text-2xl font-bold text-green-600">{summary.passed_count}/{summary.total_tests}</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : tests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Brain size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No memory tests yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Click "Load Memory Tests" to get started</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Memory Tests</p>
                    {tests.map(test => {
                        const latestResult = results.find(r => (r.memory_tests as any)?.name === test.name || r.memory_tests?.name === test.name)
                        return (
                            <div key={test.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium">{test.name}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${diffColors[test.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                                            {test.difficulty}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[test.test_type] || 'bg-gray-100 text-gray-600'}`}>
                                            {test.test_type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400">{test.description}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {test.expected_recall.map((fact, i) => (
                                            <span key={i} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{fact}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    {latestResult && (
                                        <div className="text-center">
                                            <p className={`text-sm font-bold ${scoreColor(latestResult.overall_score * 100)}`}>
                                                {(latestResult.overall_score * 100).toFixed(0)}%
                                            </p>
                                            <p className="text-xs text-gray-400">Last score</p>
                                        </div>
                                    )}
                                    <button onClick={() => handleRun(test.id)} disabled={running === test.id}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50">
                                        {running === test.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                        {running === test.id ? 'Running...' : 'Run'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {results.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Recent Results</p>
                    {results.slice(0, 10).map(result => (
                        <div key={result.id} className={`border rounded-xl overflow-hidden ${result.passed ? 'border-green-200' : 'border-red-200'}`}>
                            <div className={`p-4 flex items-center justify-between cursor-pointer ${result.passed ? 'bg-green-50' : 'bg-red-50'}`}
                                onClick={() => setExpandedResult(expandedResult === result.id ? null : result.id)}>
                                <div className="flex items-center gap-3">
                                    {result.passed ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                                    <div>
                                        <p className="text-sm font-medium">{result.memory_tests?.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors[result.memory_tests?.test_type] || 'bg-gray-100 text-gray-600'}`}>
                                                {result.memory_tests?.test_type?.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs text-gray-400">{new Date(result.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-5 shrink-0">
                                    <div className="text-center">
                                        <p className={`text-sm font-bold ${scoreColor(result.recall_score * 100)}`}>{(result.recall_score * 100).toFixed(0)}%</p>
                                        <p className="text-xs text-gray-400">Recall</p>
                                    </div>
                                    <div className="text-center">
                                        <p className={`text-sm font-bold ${scoreColor(result.overall_score * 100)}`}>{(result.overall_score * 100).toFixed(0)}%</p>
                                        <p className="text-xs text-gray-400">Overall</p>
                                    </div>
                                    {expandedResult === result.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                            </div>

                            {expandedResult === result.id && result.details && (
                                <div className="p-4 space-y-3 bg-white">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-green-700 mb-1">✅ Recalled</p>
                                            <div className="flex flex-wrap gap-1">
                                                {(result.details.recalled || []).map((f, i) => (
                                                    <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{f}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-red-700 mb-1">❌ Missed</p>
                                            <div className="flex flex-wrap gap-1">
                                                {(result.details.missed || []).map((f, i) => (
                                                    <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{f}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {result.details.judge_explanation && (
                                        <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                                            {result.details.judge_explanation}
                                        </div>
                                    )}
                                    {result.details.final_response && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">Agent Final Response</p>
                                            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-700 max-h-32 overflow-y-auto">
                                                {result.details.final_response}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}