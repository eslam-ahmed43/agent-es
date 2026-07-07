'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { GitCommit, Loader2, ArrowRightLeft, RotateCcw, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react'

interface Agent { id: string; name: string }

interface Version {
    id: string
    version_number: number
    system_prompt: string
    overall_score: number | null
    safety_score: number | null
    attack_score: number | null
    latency_avg: number | null
    improvements_applied: string[]
    created_at: string
}

interface CompareResult {
    version_a: Version
    version_b: Version
    diff: {
        overall_score: number | null
        safety_score: number | null
        attack_score: number | null
        latency_avg: number | null
    }
}

const DiffBadge = ({ value, suffix = '%', invert = false }: { value: number | null; suffix?: string; invert?: boolean }) => {
    if (value === null) return <span className="text-xs text-gray-400">N/A</span>
    const positive = invert ? value < 0 : value > 0
    const isZero = Math.abs(value) < 0.001
    if (isZero) return <span className="flex items-center gap-1 text-xs text-gray-400"><Minus size={12} /> No change</span>
    return (
        <span className={`flex items-center gap-1 text-xs font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {value > 0 ? '+' : ''}{suffix === '%' ? (value * 100).toFixed(1) : value.toFixed(0)}{suffix}
        </span>
    )
}

export default function VersionsPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [versions, setVersions] = useState<Version[]>([])
    const [loading, setLoading] = useState(true)
    const [enriching, setEnriching] = useState<string | null>(null)
    const [enrichError, setEnrichError] = useState<string | null>(null)
    const [rollingBack, setRollingBack] = useState<string | null>(null)
    const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])
    const [comparing, setComparing] = useState(false)
    const [compareResult, setCompareResult] = useState<CompareResult | null>(null)

    const fetchVersions = async (agent_id: string) => {
        try {
            const res = await api.get<{ success: boolean; data: Version[] }>(`/api/versions/${agent_id}`)
            setVersions(res.data || [])
        } catch (err) { console.error(err) }
    }

    useEffect(() => {
        api.get<{ success: boolean; data: Agent[] }>('/api/agents')
            .then(async res => {
                setAgents(res.data || [])
                if (res.data?.length > 0) {
                    setSelectedAgent(res.data[0].id)
                    await fetchVersions(res.data[0].id)
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleAgentChange = async (agent_id: string) => {
        setSelectedAgent(agent_id)
        setSelectedForCompare([])
        setCompareResult(null)
        setEnrichError(null)
        await fetchVersions(agent_id)
    }

    const handleEnrich = async (version_id: string) => {
        setEnriching(version_id)
        setEnrichError(null)
        try {
            await api.post(`/api/versions/enrich/${version_id}`, {})
            await fetchVersions(selectedAgent)
        } catch (err) {
            setEnrichError(err instanceof Error ? err.message : 'Failed to enrich version')
        } finally { setEnriching(null) }
    }

    const handleRollback = async (version_id: string) => {
        setRollingBack(version_id)
        try {
            await api.post('/api/versions/rollback', { agent_id: selectedAgent, version_id })
            await fetchVersions(selectedAgent)
        } catch (err) { console.error(err) } finally { setRollingBack(null) }
    }

    const toggleCompareSelect = (version_id: string) => {
        setCompareResult(null)
        setSelectedForCompare(prev => {
            if (prev.includes(version_id)) return prev.filter(v => v !== version_id)
            if (prev.length >= 2) return [prev[1], version_id]
            return [...prev, version_id]
        })
    }

    const handleCompare = async () => {
        if (selectedForCompare.length !== 2) return
        setComparing(true)
        try {
            const res = await api.get<{ success: boolean; data: CompareResult }>(
                `/api/versions/compare?version_a_id=${selectedForCompare[0]}&version_b_id=${selectedForCompare[1]}`
            )
            setCompareResult(res.data)
        } catch (err) { console.error(err) } finally { setComparing(false) }
    }

    const scoreColor = (score: number | null) => {
        if (score === null) return 'text-gray-400'
        return score >= 0.8 ? 'text-green-600' : score >= 0.6 ? 'text-yellow-600' : 'text-red-600'
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Versions</h1>
                    <p className="text-gray-500 text-sm mt-1">Track every prompt change and compare versions side by side</p>
                </div>
                <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700 font-medium">How it works</p>
                <p className="text-xs text-blue-600 mt-1">
                    Select two versions below (checkboxes) to compare their scores side by side. Click the refresh icon on a version to pull scores from the first completed run that happened after that version was created.
                </p>
            </div>

            {enrichError && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                    {enrichError}
                </div>
            )}

            {selectedForCompare.length === 2 && (
                <button onClick={handleCompare} disabled={comparing}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                    {comparing ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
                    {comparing ? 'Comparing...' : `Compare v${versions.find(v => v.id === selectedForCompare[0])?.version_number} vs v${versions.find(v => v.id === selectedForCompare[1])?.version_number}`}
                </button>
            )}

            {compareResult && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">
                            v{compareResult.version_a.version_number} → v{compareResult.version_b.version_number}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-400 mb-1">Overall</p>
                            <DiffBadge value={compareResult.diff.overall_score} />
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-400 mb-1">Safety</p>
                            <DiffBadge value={compareResult.diff.safety_score} />
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-400 mb-1">Attack Resistance</p>
                            <DiffBadge value={compareResult.diff.attack_score} />
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-400 mb-1">Latency</p>
                            <DiffBadge value={compareResult.diff.latency_avg} suffix="ms" invert />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">v{compareResult.version_a.version_number} Prompt</p>
                            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                {compareResult.version_a.system_prompt}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">v{compareResult.version_b.version_number} Prompt</p>
                            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                {compareResult.version_b.system_prompt}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <GitCommit size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No versions yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Apply an improvement from Auto Improve or Targeted Improve to create your first version</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {versions.map((v, idx) => (
                        <div key={v.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${selectedForCompare.includes(v.id) ? 'border-black ring-1 ring-black' : 'border-gray-200'
                            }`}>
                            <input
                                type="checkbox"
                                checked={selectedForCompare.includes(v.id)}
                                onChange={() => toggleCompareSelect(v.id)}
                                className="rounded"
                            />
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${idx === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                v{v.version_number}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">Version {v.version_number} {idx === 0 ? '(Current)' : ''}</p>
                                </div>
                                <p className="text-xs text-gray-400">{new Date(v.created_at).toLocaleString()}</p>
                                {v.improvements_applied?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {v.improvements_applied.slice(0, 2).map((imp, i) => (
                                            <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Sparkles size={10} /> {imp}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-5 text-sm shrink-0">
                                <div className="text-center w-14">
                                    <p className={`font-semibold ${scoreColor(v.overall_score)}`}>
                                        {v.overall_score !== null ? `${(v.overall_score * 100).toFixed(0)}%` : '—'}
                                    </p>
                                    <p className="text-xs text-gray-400">Overall</p>
                                </div>
                                <div className="text-center w-14">
                                    <p className={`font-semibold ${scoreColor(v.attack_score)}`}>
                                        {v.attack_score !== null ? `${(v.attack_score * 100).toFixed(0)}%` : '—'}
                                    </p>
                                    <p className="text-xs text-gray-400">Attack</p>
                                </div>
                                <div className="text-center w-16">
                                    <p className="font-semibold text-gray-600">
                                        {v.latency_avg !== null ? `${(v.latency_avg / 1000).toFixed(1)}s` : '—'}
                                    </p>
                                    <p className="text-xs text-gray-400">Latency</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleEnrich(v.id)}
                                    disabled={enriching === v.id}
                                    title="Pull scores from first run after this version"
                                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
                                    {enriching === v.id ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                                </button>
                                {idx !== 0 && (
                                    <button
                                        onClick={() => handleRollback(v.id)}
                                        disabled={rollingBack === v.id}
                                        title="Rollback to this version"
                                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition disabled:opacity-50">
                                        {rollingBack === v.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                        Rollback
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}