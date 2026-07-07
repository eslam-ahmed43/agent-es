'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Play, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'

interface Run {
    id: string
    status: string
    total_scenarios: number
    completed_scenarios: number
    overall_score: number | null
    created_at: string
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
    running: { icon: Loader2, color: 'text-blue-500', label: 'Running' },
    completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
    failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' }
}

export default function RunsPage() {
    const [runs, setRuns] = useState<Run[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get<{ success: boolean; data: Run[] }>('/api/runs')
            .then(res => setRuns(res.data || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Runs</h1>
                <p className="text-gray-500 text-sm mt-1">View all test execution history</p>
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Play size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No runs yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Runs will appear here after you execute test scenarios</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {runs.map(run => {
                        const config = statusConfig[run.status] || statusConfig.pending
                        const Icon = config.icon
                        const progress = run.total_scenarios > 0 ? Math.round((run.completed_scenarios / run.total_scenarios) * 100) : 0
                        return (
                            <div key={run.id} className="bg-white border border-gray-200 rounded-xl p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Icon size={18} className={`${config.color} ${run.status === 'running' ? 'animate-spin' : ''}`} />
                                        <div>
                                            <p className="font-medium text-sm">{run.id.slice(0, 8)}...</p>
                                            <p className="text-xs text-gray-400">{new Date(run.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="text-center">
                                            <p className="font-semibold">{run.completed_scenarios}/{run.total_scenarios}</p>
                                            <p className="text-xs text-gray-400">Scenarios</p>
                                        </div>
                                        {run.overall_score !== null && (
                                            <div className="text-center">
                                                <p className="font-semibold text-green-500">{(run.overall_score * 100).toFixed(1)}%</p>
                                                <p className="text-xs text-gray-400">Score</p>
                                            </div>
                                        )}
                                        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                                    </div>
                                </div>
                                {run.status === 'running' && (
                                    <div className="mt-3">
                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                            <div className="bg-black h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}