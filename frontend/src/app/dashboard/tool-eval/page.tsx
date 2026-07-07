'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Wrench, Play, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Agent { id: string; name: string }
interface ToolTest {
    id: string
    name: string
    description: string
    difficulty: string
    available_tools: { name: string; description: string; params: string[] }[]
    conversation: { role: string; content: string }[]
    expected_tool: string
    expected_params: Record<string, any>
    expected_call_count: number
}
interface ToolResult {
    id: string
    tool_selected: string
    params_used: Record<string, any>
    call_count: number
    correct_tool: boolean
    correct_params: boolean
    correct_count: boolean
    overall_score: number
    passed: boolean
    agent_response: string
    explanation: string
    created_at: string
    tool_tests: { name: string; difficulty: string; expected_tool: string }
}
interface Summary {
    total_tests: number
    tool_accuracy: number
    param_accuracy: number
    count_accuracy: number
    overall_score: number
    passed_count: number
    failed_count: number
}

const diffColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-orange-100 text-orange-700',
    expert: 'bg-red-100 text-red-700'
}

export default function ToolEvalPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [tests, setTests] = useState<ToolTest[]>([])
    const [results, setResults] = useState<ToolResult[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [loading, setLoading] = useState(true)
    const [seeding, setSeeding] = useState(false)
    const [running, setRunning] = useState<string | null>(null)
    const [expandedResult, setExpandedResult] = useState<string | null>(null)

    const fetchAll = async (agent_id: string) => {
        try {
            const [testsRes, resultsRes, summaryRes] = await Promise.all([
                api.get<{ success: boolean; data: ToolTest[] }>(`/api/tool-eval/${agent_id}`),
                api.get<{ success: boolean; data: ToolResult[] }>(`/api/tool-eval/results/${agent_id}`),
                api.get<{ success: boolean; data: Summary }>(`/api/tool-eval/summary/${agent_id}`)
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
            await api.post('/api/tool-eval/seed', { agent_id: selectedAgent })
            await fetchAll(selectedAgent)
        } catch (err) { console.error(err) } finally { setSeeding(false) }
    }

    const handleRun = async (test_id: string) => {
        setRunning(test_id)
        try {
            await api.post('/api/tool-eval/run', { tool_test_id: test_id, agent_id: selectedAgent })
            await fetchAll(selectedAgent)
        } catch (err) { console.error(err) } finally { setRunning(null) }
    }

    const scoreColor = (s: number) =>
        s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600'

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Tool Calling Evaluation</h1>
                    <p className="text-gray-500 text-sm mt-1">Test if your agent selects and uses tools correctly</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={handleSeed} disabled={seeding || tests.length > 0}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">
                        {seeding ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
                        {seeding ? 'Loading...' : tests.length > 0 ? `${tests.length} Tests Ready` : 'Load Tool Tests'}
                    </button>
                </div>
            </div>

            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-black text-white rounded-xl p-5">
                        <p className="text-xs text-gray-400 mb-1">Tool Score</p>
                        <p className="text-3xl font-bold">{summary.overall_score}%</p>
                        <p className="text-xs text-gray-500 mt-1">{summary.total_tests} tests</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <p className="text-xs text-gray-400 mb-1">Tool Selection</p>
                        <p className={`text-2xl font-bold ${scoreColor(summary.tool_accuracy)}`}>{summary.tool_accuracy}%</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <p className="text-xs text-gray-400 mb-1">Param Accuracy</p>
                        <p className={`text-2xl font-bold ${scoreColor(summary.param_accuracy)}`}>{summary.param_accuracy}%</p>
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
                    <Wrench size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No tool tests yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Click "Load Tool Tests" to get started</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Tool Tests</p>
                    {tests.map(test => {
                        const latestResult = results.find(r => r.tool_tests?.name === test.name)
                        return (
                            <div key={test.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium">{test.name}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${diffColors[test.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                                            {test.difficulty}
                                        </span>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                            Expected: <strong>{test.expected_tool}</strong>
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400">{test.description}</p>
                                    <p className="text-xs text-gray-500 mt-1 italic">"{(test.conversation[0] as any)?.content}"</p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    {latestResult && (
                                        <div className="text-center">
                                            <p className={`text-sm font-bold ${scoreColor(latestResult.overall_score * 100)}`}>
                                                {(latestResult.overall_score * 100).toFixed(0)}%
                                            </p>
                                            <p className="text-xs text-gray-400">Last</p>
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
                                        <p className="text-sm font-medium">{result.tool_tests?.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${diffColors[result.tool_tests?.difficulty] || 'bg-gray-100'}`}>
                                                {result.tool_tests?.difficulty}
                                            </span>
                                            <span className="text-xs text-gray-400">{new Date(result.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-5 shrink-0">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className={`px-2 py-0.5 rounded-full font-medium ${result.correct_tool ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            Tool: {result.tool_selected}
                                        </span>
                                        {result.correct_tool ? <CheckCircle size={12} className="text-green-500" /> : <XCircle size={12} className="text-red-500" />}
                                    </div>
                                    <div className="text-center">
                                        <p className={`text-sm font-bold ${scoreColor(result.overall_score * 100)}`}>
                                            {(result.overall_score * 100).toFixed(0)}%
                                        </p>
                                        <p className="text-xs text-gray-400">Score</p>
                                    </div>
                                    {expandedResult === result.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                            </div>

                            {expandedResult === result.id && (
                                <div className="p-4 space-y-3 bg-white">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className={`p-2 rounded-lg text-center ${result.correct_tool ? 'bg-green-50' : 'bg-red-50'}`}>
                                            <p className="text-xs text-gray-500">Tool Selected</p>
                                            <p className={`text-sm font-bold ${result.correct_tool ? 'text-green-600' : 'text-red-600'}`}>{result.tool_selected}</p>
                                            {result.correct_tool ? <CheckCircle size={12} className="text-green-500 mx-auto mt-1" /> : <XCircle size={12} className="text-red-500 mx-auto mt-1" />}
                                        </div>
                                        <div className={`p-2 rounded-lg text-center ${result.correct_params ? 'bg-green-50' : 'bg-red-50'}`}>
                                            <p className="text-xs text-gray-500">Params Correct</p>
                                            <p className={`text-sm font-bold ${result.correct_params ? 'text-green-600' : 'text-red-600'}`}>
                                                {result.correct_params ? 'Yes' : 'No'}
                                            </p>
                                        </div>
                                        <div className={`p-2 rounded-lg text-center ${result.correct_count ? 'bg-green-50' : 'bg-red-50'}`}>
                                            <p className="text-xs text-gray-500">Call Count</p>
                                            <p className={`text-sm font-bold ${result.correct_count ? 'text-green-600' : 'text-red-600'}`}>
                                                {result.call_count}x
                                            </p>
                                        </div>
                                    </div>

                                    {Object.keys(result.params_used || {}).length > 0 && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">Params Used</p>
                                            <div className="p-2 bg-gray-50 rounded-lg text-xs font-mono text-gray-600">
                                                {JSON.stringify(result.params_used, null, 2)}
                                            </div>
                                        </div>
                                    )}

                                    {result.explanation && (
                                        <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                                            <strong>Reasoning:</strong> {result.explanation}
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