'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Crown, Medal, RefreshCw, Loader2, TrendingUp } from 'lucide-react'

interface RankingEntry {
    rank: number
    overall_score: number
    agents: { name: string; model: string; type: string }
    benchmarks: { name: string; domain: string }
}

interface RankingsData {
    week_start: string
    rankings: Record<string, RankingEntry[]>
}

const rankIcons = [
    <Crown key={1} size={16} className="text-yellow-500" />,
    <Medal key={2} size={16} className="text-gray-400" />,
    <Medal key={3} size={16} className="text-amber-600" />
]

export default function RankingsPage() {
    const [data, setData] = useState<RankingsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchRankings = async () => {
        try {
            const res = await api.get<{ success: boolean; data: RankingsData }>('/api/rankings')
            setData(res.data)
        } catch (err) { console.error(err) }
    }

    useEffect(() => {
        fetchRankings().finally(() => setLoading(false))
    }, [])

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            await api.post('/api/rankings/refresh', {})
            await fetchRankings()
        } catch (err) { console.error(err) } finally { setRefreshing(false) }
    }

    const scoreColor = (score: number) =>
        score >= 0.8 ? 'text-green-600' : score >= 0.6 ? 'text-yellow-600' : 'text-red-600'

    const benchmarkNames = data ? Object.keys(data.rankings) : []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Weekly Rankings</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {data ? `Week of ${new Date(data.week_start).toLocaleDateString()}` : 'How every agent stacks up, per benchmark'}
                    </p>
                </div>
                <button onClick={handleRefresh} disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                    {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {refreshing ? 'Refreshing...' : 'Refresh Rankings'}
                </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700 font-medium">How it works</p>
                <p className="text-xs text-blue-600 mt-1">
                    Ranks every agent that has run each benchmark, based on their latest leaderboard score. Click Refresh to recompute for the current week after new benchmark runs.
                </p>
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : benchmarkNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <TrendingUp size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No rankings yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Click "Refresh Rankings" after running some benchmarks</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {benchmarkNames.map(benchName => {
                        const entries = data!.rankings[benchName]
                        return (
                            <div key={benchName} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="p-5 border-b border-gray-100">
                                    <p className="font-semibold text-sm">{benchName}</p>
                                    <p className="text-xs text-gray-400 capitalize">{entries[0]?.benchmarks?.domain}</p>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {entries.map((e, idx) => (
                                        <div key={idx} className={`p-4 flex items-center gap-4 ${idx === 0 ? 'bg-yellow-50/30' : ''}`}>
                                            <div className="w-8 flex justify-center shrink-0">
                                                {idx < 3 ? rankIcons[idx] : <span className="text-sm text-gray-400 font-medium">#{e.rank}</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{e.agents?.name}</p>
                                                <p className="text-xs text-gray-400">{e.agents?.model || e.agents?.type}</p>
                                            </div>
                                            <p className={`text-lg font-bold ${scoreColor(e.overall_score)}`}>
                                                {(e.overall_score * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}