'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { FileText } from 'lucide-react'

interface ReportSummary {
    total_runs: number
    avg_score: number
    passed_scenarios: number
    failed_scenarios: number
    top_failure_reason: string | null
}

export default function ReportsPage() {
    const [summary, setSummary] = useState<ReportSummary | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get<{ success: boolean; data: ReportSummary }>('/api/reports/summary')
            .then(res => setSummary(res.data))
            .catch(() => setSummary({ total_runs: 0, avg_score: 0, passed_scenarios: 0, failed_scenarios: 0, top_failure_reason: null }))
            .finally(() => setLoading(false))
    }, [])

    const scoreColor = (s: number) => s >= 0.8 ? 'text-green-500' : s >= 0.6 ? 'text-yellow-500' : 'text-red-500'

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Reports</h1>
                <p className="text-gray-500 text-sm mt-1">Overview of your agent performance</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : summary ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-sm text-gray-500">Total Runs</p>
                            <p className="text-3xl font-bold mt-1">{summary.total_runs}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-sm text-gray-500">Avg Score</p>
                            <p className={`text-3xl font-bold mt-1 ${scoreColor(summary.avg_score)}`}>{(summary.avg_score * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-sm text-gray-500">Passed</p>
                            <p className="text-3xl font-bold mt-1 text-green-500">{summary.passed_scenarios}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-sm text-gray-500">Failed</p>
                            <p className="text-3xl font-bold mt-1 text-red-500">{summary.failed_scenarios}</p>
                        </div>
                    </div>
                    {summary.total_runs === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <FileText size={48} className="text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium">No data yet</h3>
                            <p className="text-gray-500 text-sm mt-1">Run some tests to see reports here</p>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    )
}