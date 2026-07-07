'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Trophy, Medal, Crown, TrendingUp, Bot, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'

interface LeaderboardEntry {
    id: string
    overall_score: number
    easy_score: number | null
    medium_score: number | null
    hard_score: number | null
    expert_score: number | null
    passed_count: number
    failed_count: number
    total_count: number
    latency_avg: number | null
    rank: number
    created_at: string
    agents: { name: string; model: string; type: string; description: string }
    benchmarks: { name: string; domain: string }
}

interface BenchmarkLeaderboard {
    benchmark: { id: string; name: string; domain: string; agent_type: string }
    top_agents: LeaderboardEntry[]
}

const rankIcons = [
    <Crown key={1} size={18} className="text-yellow-500" />,
    <Medal key={2} size={18} className="text-gray-400" />,
    <Medal key={3} size={18} className="text-amber-600" />
]

const scoreColor = (score: number) =>
    score >= 0.9 ? 'text-green-600' : score >= 0.75 ? 'text-blue-600' : score >= 0.6 ? 'text-yellow-600' : 'text-red-600'

const ScoreCell = ({ score, label }: { score: number | null; label: string }) => (
    <div className="text-center">
        <p className={`text-sm font-semibold ${score !== null ? scoreColor(score) : 'text-gray-300'}`}>
            {score !== null ? `${(score * 100).toFixed(0)}%` : '-'}
        </p>
        <p className="text-xs text-gray-400">{label}</p>
    </div>
)

export default function LeaderboardPage() {
    const [leaderboards, setLeaderboards] = useState<BenchmarkLeaderboard[]>([])
    const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null)
    const [fullLeaderboard, setFullLeaderboard] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingFull, setLoadingFull] = useState(false)
    const [expanded, setExpanded] = useState<string | null>(null)

    useEffect(() => {
        api.get<{ success: boolean; data: BenchmarkLeaderboard[] }>('/api/leaderboard')
            .then(res => setLeaderboards(res.data || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const loadFullLeaderboard = async (benchmark_id: string) => {
        if (expanded === benchmark_id) { setExpanded(null); return }
        setLoadingFull(true)
        setSelectedBenchmark(benchmark_id)
        try {
            const res = await api.get<{ success: boolean; data: LeaderboardEntry[] }>(`/api/leaderboard/${benchmark_id}`)
            setFullLeaderboard(res.data || [])
            setExpanded(benchmark_id)
        } catch (err) { console.error(err) } finally { setLoadingFull(false) }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Agent Leaderboard</h1>
                <p className="text-gray-500 text-sm mt-1">Compare your agents across all benchmarks</p>
            </div>

            {loading ? (
                <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : leaderboards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Trophy size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No leaderboard data yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Run a benchmark to see your agents ranked here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {leaderboards.map(({ benchmark, top_agents }) => (
                        <div key={benchmark.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-yellow-50 rounded-lg">
                                            <Trophy size={18} className="text-yellow-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{benchmark.name}</h3>
                                            <p className="text-xs text-gray-400 capitalize">{benchmark.domain} • {benchmark.agent_type}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => loadFullLeaderboard(benchmark.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                                        <BarChart3 size={12} />
                                        {expanded === benchmark.id ? 'Collapse' : 'View Full'}
                                        {expanded === benchmark.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                </div>
                            </div>

                            {top_agents.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bot size={32} className="text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">No agents have run this benchmark yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {(expanded === benchmark.id ? fullLeaderboard : top_agents).map((entry, idx) => (
                                        <div key={entry.id} className={`p-4 flex items-center gap-4 ${idx === 0 ? 'bg-yellow-50/30' : ''}`}>
                                            <div className="w-8 flex justify-center shrink-0">
                                                {idx < 3 ? rankIcons[idx] : <span className="text-sm text-gray-400 font-medium">#{entry.rank}</span>}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm truncate">{entry.agents?.name}</p>
                                                    {idx === 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Top Agent</span>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-gray-400">{entry.agents?.model || entry.agents?.type}</span>
                                                    <span className="text-xs text-gray-300">•</span>
                                                    <span className="text-xs text-gray-400">{entry.total_count} scenarios</span>
                                                    {entry.latency_avg && (
                                                        <>
                                                            <span className="text-xs text-gray-300">•</span>
                                                            <span className="text-xs text-gray-400">{(entry.latency_avg / 1000).toFixed(1)}s avg</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 shrink-0">
                                                <ScoreCell score={entry.easy_score} label="Easy" />
                                                <ScoreCell score={entry.medium_score} label="Medium" />
                                                <ScoreCell score={entry.hard_score} label="Hard" />
                                                <ScoreCell score={entry.expert_score} label="Expert" />
                                                <div className="text-center min-w-[60px]">
                                                    <p className={`text-lg font-bold ${scoreColor(entry.overall_score)}`}>
                                                        {(entry.overall_score * 100).toFixed(1)}%
                                                    </p>
                                                    <p className="text-xs text-gray-400">Overall</p>
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span className="text-green-500 font-medium">{entry.passed_count}✓</span>
                                                        <span className="text-red-500 font-medium">{entry.failed_count}✗</span>
                                                    </div>
                                                    <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                                        <div
                                                            className="bg-green-500 h-1.5 rounded-full"
                                                            style={{ width: `${(entry.passed_count / entry.total_count) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}