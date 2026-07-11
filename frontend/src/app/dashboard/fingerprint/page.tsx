'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Cpu, CheckCircle, XCircle, Loader2, Zap, AlertTriangle, Shield } from 'lucide-react'

interface Agent { id: string; name: string; mcp_tools?: any[]; mcp_url?: string }
interface Fingerprint {
    framework: string
    transport: string
    tools_count: number
    has_memory: boolean
    has_planning: boolean
    has_tool_calling: boolean
    has_streaming: boolean
    has_rag: boolean
    has_browser: boolean
    has_multi_agent: boolean
    detected_model: string
    missing_capabilities: string[]
    production_checklist: Record<string, boolean>
    checklist_score: number
    certification_level: string
    confidence: number
    agent_type: string
    domain: string
}

const certColors: Record<string, string> = {
    platinum: 'bg-purple-100 text-purple-700 border-purple-300',
    gold: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    silver: 'bg-gray-100 text-gray-700 border-gray-300',
    bronze: 'bg-orange-100 text-orange-700 border-orange-300',
    none: 'bg-red-100 text-red-700 border-red-300'
}

export default function FingerprintPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [fingerprint, setFingerprint] = useState<Fingerprint | null>(null)
    const [loading, setLoading] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)

    useEffect(() => {
        api.get<{ success: boolean; data: Agent[] }>('/api/agents')
            .then(res => {
                setAgents(res.data || [])
                if (res.data?.length > 0) {
                    setSelectedAgent(res.data[0].id)
                    loadFingerprint(res.data[0].id)
                }
            }).catch(console.error)
    }, [])

    const loadFingerprint = async (agent_id: string) => {
        setLoading(true)
        try {
            const res = await api.get<{ success: boolean; data: Fingerprint }>(`/api/fingerprint/${agent_id}`)
            setFingerprint(res.data)
        } catch { setFingerprint(null) }
        setLoading(false)
    }

    const handleAgentChange = (id: string) => {
        setSelectedAgent(id)
        loadFingerprint(id)
    }

    const handleAnalyze = async () => {
        setAnalyzing(true)
        try {
            const res = await api.post<{ success: boolean; data: Fingerprint }>(`/api/fingerprint/analyze/${selectedAgent}`, {})
            setFingerprint(res.data)
        } catch (err) { console.error(err) }
        setAnalyzing(false)
    }

    const capabilities = fingerprint ? [
        { label: 'Memory', value: fingerprint.has_memory },
        { label: 'Planning', value: fingerprint.has_planning },
        { label: 'Tool Calling', value: fingerprint.has_tool_calling },
        { label: 'Streaming', value: fingerprint.has_streaming },
        { label: 'RAG', value: fingerprint.has_rag },
        { label: 'Browser', value: fingerprint.has_browser },
        { label: 'Multi-Agent', value: fingerprint.has_multi_agent }
    ] : []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Agent Intelligence</h1>
                    <p className="text-gray-500 text-sm mt-1">Deep analysis of your agent's capabilities and production readiness</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={handleAnalyze} disabled={analyzing}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                        {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Cpu size={14} />}
                        {analyzing ? 'Analyzing...' : 'Analyze Agent'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : !fingerprint ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Cpu size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No fingerprint yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Connect an MCP server first, then click "Analyze Agent"</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-black text-white rounded-xl p-5">
                            <p className="text-xs text-gray-400 mb-1">Framework</p>
                            <p className="text-xl font-bold">{fingerprint.framework}</p>
                            <p className="text-xs text-gray-500 mt-1">{fingerprint.transport}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-xs text-gray-400 mb-1">Agent Type</p>
                            <p className="text-lg font-bold capitalize">{fingerprint.agent_type?.replace('_', ' ')}</p>
                            <p className="text-xs text-gray-400 capitalize">{fingerprint.domain}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-xs text-gray-400 mb-1">Tools</p>
                            <p className="text-3xl font-bold">{fingerprint.tools_count}</p>
                            <p className="text-xs text-gray-400">MCP tools discovered</p>
                        </div>
                        <div className={`border rounded-xl p-5 ${certColors[fingerprint.certification_level]}`}>
                            <p className="text-xs mb-1">Certification</p>
                            <p className="text-xl font-bold capitalize">{fingerprint.certification_level}</p>
                            <p className="text-xs mt-1">Production Score: {fingerprint.checklist_score}%</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-sm font-semibold mb-4">Capability Graph</p>
                            <div className="space-y-3">
                                {capabilities.map((cap, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-24 text-xs text-gray-500">{cap.label}</div>
                                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                                            <div className={`h-2 rounded-full ${cap.value ? 'bg-black' : 'bg-gray-200'}`}
                                                style={{ width: cap.value ? '100%' : '10%' }} />
                                        </div>
                                        {cap.value
                                            ? <CheckCircle size={14} className="text-green-500 shrink-0" />
                                            : <XCircle size={14} className="text-gray-300 shrink-0" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <Shield size={14} className="text-blue-500" />
                                Production Checklist — {fingerprint.checklist_score}%
                            </p>
                            <div className="space-y-2">
                                {Object.entries(fingerprint.production_checklist).map(([key, val], i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        {val
                                            ? <CheckCircle size={13} className="text-green-500 shrink-0" />
                                            : <XCircle size={13} className="text-red-400 shrink-0" />}
                                        <span className={`text-xs capitalize ${val ? 'text-gray-700' : 'text-red-500'}`}>
                                            {key.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {fingerprint.missing_capabilities.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle size={16} className="text-red-500" />
                                <p className="text-sm font-semibold text-red-700">Missing Capabilities</p>
                            </div>
                            <div className="space-y-1">
                                {fingerprint.missing_capabilities.map((cap, i) => (
                                    <p key={i} className="text-xs text-red-600 flex items-center gap-2">
                                        <XCircle size={12} /> {cap}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}