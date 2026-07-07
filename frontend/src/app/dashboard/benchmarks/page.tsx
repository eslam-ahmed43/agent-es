'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { BarChart3, Play, Trophy, Loader2, CheckCircle, XCircle, Code, Shield, Database, MessageSquare, Bot, Zap, TrendingUp } from 'lucide-react'

interface Benchmark {
    id: string
    name: string
    description: string
    domain: string
    agent_type: string
    version: string
    is_official: boolean
    tags: string[]
    scenario_count: number
    passing_threshold: number
    difficulty_distribution?: Record<string, number>
    source_distribution?: Record<string, number>
}

interface Agent { id: string; name: string; project_id: string; type: string }

const agentTypeIcons: Record<string, any> = {
    chat: MessageSquare,
    coding: Code,
    security: Shield,
    rag: Database,
    default: Bot
}

const agentTypeColors: Record<string, string> = {
    chat: 'bg-blue-50 text-blue-600 border-blue-200',
    coding: 'bg-purple-50 text-purple-600 border-purple-200',
    security: 'bg-red-50 text-red-600 border-red-200',
    rag: 'bg-green-50 text-green-600 border-green-200',
    default: 'bg-gray-50 text-gray-600 border-gray-200'
}

const difficultyColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-orange-100 text-orange-700',
    expert: 'bg-red-100 text-red-700'
}

export default function BenchmarksPage() {
    const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [seeding, setSeeding] = useState(false)
    const [expanding, setExpanding] = useState<string | null>(null)
    const [showRunModal, setShowRunModal] = useState(false)
    const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null)
    const [selectedAgent, setSelectedAgent] = useState('')
    const [starting, setStarting] = useState(false)
    const [runSuccess, setRunSuccess] = useState<string | null>(null)
    const [expandSuccess, setExpandSuccess] = useState<string | null>(null)
    const [filter, setFilter] = useState('all')
    const [targetCount, setTargetCount] = useState(50)

    const fetchData = async () => {
        try {
            const [benchRes, agentsRes] = await Promise.all([
                api.get<{ success: boolean; data: Benchmark[] }>('/api/benchmarks'),
                api.get<{ success: boolean; data: Agent[] }>('/api/agents')
            ])
            setBenchmarks(benchRes.data || [])
            setAgents(agentsRes.data || [])
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    const handleSeed = async () => {
        setSeeding(true)
        try {
            await api.post('/api/benchmarks/seed', {})
            await fetchData()
        } catch (err) { console.error(err) } finally { setSeeding(false) }
    }

    const handleExpand = async (benchmark: Benchmark) => {
        setExpanding(benchmark.id)
        setExpandSuccess(null)
        try {
            const res = await api.post<{ success: boolean; data: { added: number; total: number }; message: string }>(
                '/api/benchmarks/expand',
                { benchmark_id: benchmark.id, target_count: targetCount }
            )
            setExpandSuccess(`${res.message}`)
            await fetchData()
        } catch (err) { console.error(err) } finally { setExpanding(null) }
    }

    const handleRunBenchmark = async () => {
        if (!selectedBenchmark || !selectedAgent) return
        setStarting(true)
        try {
            const agent = agents.find(a => a.id === selectedAgent)
            const res = await api.post<{ success: boolean; data: { run_id: string } }>('/api/benchmarks/run', {
                benchmark_id: selectedBenchmark.id,
                agent_id: selectedAgent,
                project_id: agent?.project_id
            })
            setRunSuccess(res.data?.run_id || null)
            setShowRunModal(false)
            setSelectedAgent('')
        } catch (err) { console.error(err) } finally { setStarting(false) }
    }

    const filteredBenchmarks = benchmarks.filter(b =>
        filter === 'all' ? true : b.agent_type === filter
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Benchmark Library</h1>
                    <p className="text-gray-500 text-sm mt-1">Official evaluation frameworks for every type of AI agent</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Target:</label>
                        <select value={targetCount} onChange={(e) => setTargetCount(parseInt(e.target.value))}
                            className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-black">
                            <option value={20}>20 scenarios</option>
                            <option value={50}>50 scenarios</option>
                            <option value={100}>100 scenarios</option>
                        </select>
                    </div>
                    <button onClick={handleSeed} disabled={seeding}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                        {seeding ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
                        {seeding ? 'Loading...' : 'Load Official Benchmarks'}
                    </button>
                </div>
            </div>

            {runSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                    <CheckCircle size={18} className="text-green-500" />
                    <div>
                        <p className="text-sm font-medium text-green-700">Benchmark run started!</p>
                        <p className="text-xs text-green-600">Run ID: {runSuccess.slice(0, 8)}... — Check the Runs page for results</p>
                    </div>
                    <button onClick={() => setRunSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
                        <XCircle size={16} />
                    </button>
                </div>
            )}

            {expandSuccess && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                    <TrendingUp size={18} className="text-blue-500" />
                    <p className="text-sm text-blue-700">{expandSuccess}</p>
                    <button onClick={() => setExpandSuccess(null)} className="ml-auto text-blue-500 hover:text-blue-700">
                        <XCircle size={16} />
                    </button>
                </div>
            )}

            <div className="flex gap-2">
                {['all', 'chat', 'coding', 'rag', 'security'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${filter === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}>
                        {f === 'all' ? 'All Types' : f}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : filteredBenchmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <BarChart3 size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No benchmarks yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Click "Load Official Benchmarks" to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredBenchmarks.map(benchmark => {
                        const Icon = agentTypeIcons[benchmark.agent_type] || agentTypeIcons.default
                        const colorClass = agentTypeColors[benchmark.agent_type] || agentTypeColors.default
                        const isExpanding = expanding === benchmark.id

                        return (
                            <div key={benchmark.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-400 transition">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg border ${colorClass}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-sm">{benchmark.name}</h3>
                                                {benchmark.is_official && (
                                                    <span className="text-xs bg-yellow-50 text-yellow-600 border border-yellow-200 px-2 py-0.5 rounded-full">Official</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 capitalize">{benchmark.agent_type} • v{benchmark.version}</p>
                                        </div>
                                    </div>
                                    <Trophy size={16} className="text-gray-300" />
                                </div>

                                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{benchmark.description}</p>

                                {benchmark.difficulty_distribution && Object.keys(benchmark.difficulty_distribution).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {Object.entries(benchmark.difficulty_distribution).map(([level, count]) => (
                                            <span key={level} className={`text-xs px-2 py-0.5 rounded-full capitalize ${difficultyColors[level] || 'bg-gray-100 text-gray-600'}`}>
                                                {level}: {count}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {benchmark.source_distribution && Object.keys(benchmark.source_distribution).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {Object.entries(benchmark.source_distribution).map(([source, count]) => (
                                            <span key={source} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                {source.replace('_', ' ')}: {count}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {benchmark.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className="text-xs bg-gray-50 text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">{tag}</span>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="font-medium">{benchmark.scenario_count} scenarios</span>
                                        <span>Pass: {(benchmark.passing_threshold * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleExpand(benchmark)}
                                            disabled={isExpanding}
                                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition disabled:opacity-50">
                                            {isExpanding ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                            {isExpanding ? 'Expanding...' : 'Expand'}
                                        </button>
                                        <button
                                            onClick={() => { setSelectedBenchmark(benchmark); setShowRunModal(true) }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition">
                                            <Play size={12} /> Run
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {showRunModal && selectedBenchmark && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md space-y-4">
                        <h2 className="text-lg font-semibold">Run Benchmark</h2>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium">{selectedBenchmark.name}</p>
                            <p className="text-xs text-gray-500">{selectedBenchmark.scenario_count} scenarios • Pass: {(selectedBenchmark.passing_threshold * 100).toFixed(0)}%</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Agent</label>
                            <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                                <option value="">Choose an agent...</option>
                                {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                            </select>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                            Will run all {selectedBenchmark.scenario_count} scenarios and evaluate using the Judge Engine.
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => { setShowRunModal(false); setSelectedBenchmark(null) }}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleRunBenchmark} disabled={starting || !selectedAgent}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
                                {starting ? <><Loader2 size={14} className="animate-spin" /> Starting...</> : <><Play size={14} /> Start</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}