'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Shield, Play, CheckCircle, XCircle, AlertTriangle, Loader2, BarChart3, Database } from 'lucide-react'

interface ValidationDetail {
    scenario: string
    quality_level: string
    human_score: number
    judge_score: number
    difference: string
    is_accurate: boolean
    confidence: string
}

interface ValidationResult {
    total: number
    avg_difference: number
    accuracy_rate: number
    confidence_distribution: Record<string, number>
    details: ValidationDetail[]
}

interface JudgeReport {
    id: string
    judge_provider: string
    judge_model: string
    total_evaluated: number
    avg_difference: number
    accuracy_rate: number
    confidence_distribution: Record<string, number>
    created_at: string
}

const confidenceColors: Record<string, string> = {
    high: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-red-600 bg-red-50 border-red-200'
}

const qualityColors: Record<string, string> = {
    excellent: 'text-green-600 bg-green-50',
    average: 'text-yellow-600 bg-yellow-50',
    poor: 'text-red-600 bg-red-50'
}

export default function JudgeValidationPage() {
    const [seeding, setSeeding] = useState(false)
    const [validating, setValidating] = useState(false)
    const [result, setResult] = useState<ValidationResult | null>(null)
    const [reports, setReports] = useState<JudgeReport[]>([])
    const [datasetCount, setDatasetCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchReports = async () => {
        try {
            const [reportsRes, datasetRes] = await Promise.all([
                api.get<{ success: boolean; data: JudgeReport[] }>('/api/judge-validation/reports'),
                api.get<{ success: boolean; data: any[] }>('/api/judge-validation/dataset')
            ])
            setReports(reportsRes.data || [])
            setDatasetCount(datasetRes.data?.length || 0)
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    useEffect(() => { fetchReports() }, [])

    const handleSeed = async () => {
        setSeeding(true)
        setError(null)
        try {
            await api.post('/api/judge-validation/seed', {})
            await fetchReports()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to seed dataset')
        } finally { setSeeding(false) }
    }

    const handleValidate = async () => {
        setValidating(true)
        setError(null)
        setResult(null)
        try {
            const res = await api.post<{ success: boolean; data: ValidationResult }>('/api/judge-validation/validate', {})
            setResult(res.data)
            await fetchReports()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Validation failed')
        } finally { setValidating(false) }
    }

    const getAccuracyColor = (rate: number) =>
        rate >= 90 ? 'text-green-500' : rate >= 75 ? 'text-yellow-500' : 'text-red-500'

    const getAccuracyLabel = (rate: number) =>
        rate >= 90 ? 'Excellent' : rate >= 75 ? 'Good' : rate >= 60 ? 'Acceptable' : 'Needs Improvement'

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Judge Validation</h1>
                <p className="text-gray-500 text-sm mt-1">Measure how accurately the AI Judge evaluates agent responses</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Database size={16} className="text-gray-400" />
                        <p className="text-sm text-gray-500">Gold Dataset</p>
                    </div>
                    <p className="text-3xl font-bold">{datasetCount}</p>
                    <p className="text-xs text-gray-400 mt-1">Human-labeled examples</p>
                </div>

                {reports.length > 0 && (
                    <>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield size={16} className="text-gray-400" />
                                <p className="text-sm text-gray-500">Judge Accuracy</p>
                            </div>
                            <p className={`text-3xl font-bold ${getAccuracyColor(reports[0].accuracy_rate)}`}>
                                {reports[0].accuracy_rate.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{getAccuracyLabel(reports[0].accuracy_rate)}</p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 size={16} className="text-gray-400" />
                                <p className="text-sm text-gray-500">Avg Difference</p>
                            </div>
                            <p className={`text-3xl font-bold ${reports[0].avg_difference <= 10 ? 'text-green-500' : reports[0].avg_difference <= 20 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {reports[0].avg_difference.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Human vs Judge score gap</p>
                        </div>
                    </>
                )}
            </div>

            <div className="flex gap-3">
                <button onClick={handleSeed} disabled={seeding || datasetCount > 0}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">
                    {seeding ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                    {seeding ? 'Seeding...' : datasetCount > 0 ? `Dataset Ready (${datasetCount})` : 'Seed Gold Dataset'}
                </button>

                <button onClick={handleValidate} disabled={validating || datasetCount === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                    {validating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    {validating ? 'Validating Judge...' : 'Run Judge Validation'}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <AlertTriangle size={16} className="text-red-500" />
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {validating && (
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl text-center">
                    <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-blue-700">Running Judge Validation...</p>
                    <p className="text-xs text-blue-500 mt-1">Comparing AI Judge scores with human scores on {datasetCount} examples</p>
                </div>
            )}

            {result && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold">{result.total}</p>
                            <p className="text-xs text-gray-400">Evaluated</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className={`text-2xl font-bold ${getAccuracyColor(result.accuracy_rate)}`}>
                                {result.accuracy_rate.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-400">Accuracy Rate</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className={`text-2xl font-bold ${result.avg_difference <= 10 ? 'text-green-500' : 'text-yellow-500'}`}>
                                {result.avg_difference.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-400">Avg Difference</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-green-500">{result.confidence_distribution.high || 0}</p>
                            <p className="text-xs text-gray-400">High Confidence</p>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <p className="text-sm font-medium">Confidence Distribution</p>
                        </div>
                        <div className="flex gap-3">
                            {Object.entries(result.confidence_distribution).map(([level, count]) => (
                                <div key={level} className={`flex-1 p-3 rounded-lg border text-center ${confidenceColors[level]}`}>
                                    <p className="text-2xl font-bold">{count}</p>
                                    <p className="text-xs capitalize">{level}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                            <p className="text-sm font-medium">Validation Details</p>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {result.details.map((detail, idx) => (
                                <div key={idx} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {detail.is_accurate
                                            ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                                            : <XCircle size={16} className="text-red-500 shrink-0" />}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{detail.scenario}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${qualityColors[detail.quality_level]}`}>
                                                    {detail.quality_level}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${confidenceColors[detail.confidence]}`}>
                                                    {detail.confidence} confidence
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm shrink-0">
                                        <div className="text-center">
                                            <p className="font-semibold text-blue-600">{detail.human_score}%</p>
                                            <p className="text-xs text-gray-400">Human</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-semibold text-purple-600">{typeof detail.judge_score === 'number' ? detail.judge_score.toFixed(1) : detail.judge_score}%</p>
                                            <p className="text-xs text-gray-400">Judge</p>
                                        </div>
                                        <div className="text-center">
                                            <p className={`font-semibold ${parseFloat(detail.difference) <= 10 ? 'text-green-600' : parseFloat(detail.difference) <= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {detail.difference}%
                                            </p>
                                            <p className="text-xs text-gray-400">Gap</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {reports.length > 0 && !result && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <p className="text-sm font-medium">Previous Validation Reports</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {reports.map(report => (
                            <div key={report.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">{report.judge_model}</p>
                                    <p className="text-xs text-gray-400">{new Date(report.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="text-center">
                                        <p className={`font-semibold ${getAccuracyColor(report.accuracy_rate)}`}>{report.accuracy_rate.toFixed(1)}%</p>
                                        <p className="text-xs text-gray-400">Accuracy</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-semibold">{report.avg_difference.toFixed(1)}%</p>
                                        <p className="text-xs text-gray-400">Avg Gap</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-semibold">{report.total_evaluated}</p>
                                        <p className="text-xs text-gray-400">Evaluated</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}