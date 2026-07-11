'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Link2, Loader2, CheckCircle, XCircle, Zap, Search, BarChart3, Bot, Wrench } from 'lucide-react'

interface Agent { id: string; name: string; type: string }
interface Tool { name: string; description: string }
interface DiscoveryResult {
    tools: Tool[]
    agent_type: string
    domain: string
    capabilities: Record<string, any>
    recommended_benchmarks: { id: string; name: string; domain: string; relevance_score: number }[]
}

export default function MCPPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [mcpUrl, setMcpUrl] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [discovering, setDiscovering] = useState(false)
    const [connecting, setConnecting] = useState(false)
    const [result, setResult] = useState<DiscoveryResult | null>(null)
    const [error, setError] = useState('')
    const [connected, setConnected] = useState(false)

    useEffect(() => {
        api.get<{ success: boolean; data: Agent[] }>('/api/agents')
            .then(res => {
                setAgents(res.data || [])
                if (res.data?.length > 0) setSelectedAgent(res.data[0].id)
            })
            .catch(console.error)
    }, [])

    const handleDiscover = async () => {
        if (!mcpUrl) return
        setDiscovering(true)
        setError('')
        setResult(null)
        setConnected(false)
        try {
            const res = await api.post<{ success: boolean; data: DiscoveryResult }>('/api/mcp/discover', {
                mcp_url: mcpUrl,
                api_key: apiKey || undefined
            })
            setResult(res.data)
        } catch (err: any) {
            setError(err.message || 'Discovery failed')
        } finally { setDiscovering(false) }
    }

    const handleConnect = async () => {
        if (!mcpUrl || !selectedAgent) return
        setConnecting(true)
        try {
            await api.post('/api/mcp/connect', {
                agent_id: selectedAgent,
                mcp_url: mcpUrl,
                api_key: apiKey || undefined
            })
            setConnected(true)
        } catch (err: any) {
            setError(err.message || 'Connection failed')
        } finally { setConnecting(false) }
    }

    const typeColor: Record<string, string> = {
        customer_support: 'bg-blue-100 text-blue-700',
        sales: 'bg-green-100 text-green-700',
        coding: 'bg-purple-100 text-purple-700',
        rag: 'bg-orange-100 text-orange-700',
        data_analysis: 'bg-yellow-100 text-yellow-700',
        automation: 'bg-pink-100 text-pink-700',
        general: 'bg-gray-100 text-gray-700'
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">MCP Integration</h1>
                <p className="text-gray-500 text-sm mt-1">Connect any MCP Server and AgentOS will auto-discover tools, detect agent type, and recommend benchmarks</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Link2 size={18} className="text-gray-400" />
                    <h2 className="font-semibold">Connect MCP Server</h2>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-medium text-gray-700">MCP Server URL</label>
                        <input value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)}
                            placeholder="https://your-agent.com/mcp"
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">API Key (optional)</label>
                        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Link to Agent</label>
                        <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={handleDiscover} disabled={discovering || !mcpUrl}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">
                        {discovering ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        {discovering ? 'Discovering...' : 'Discover'}
                    </button>
                    {result && (
                        <button onClick={handleConnect} disabled={connecting || !selectedAgent}
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                            {connecting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                            {connecting ? 'Connecting...' : connected ? '✓ Connected' : 'Connect & Save'}
                        </button>
                    )}
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                        <XCircle size={14} /> {error}
                    </div>
                )}
            </div>

            {result && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black text-white rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Bot size={16} className="text-gray-400" />
                                <p className="text-xs text-gray-400">Agent Type</p>
                            </div>
                            <p className="text-xl font-bold capitalize">{result.agent_type.replace('_', ' ')}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${typeColor[result.agent_type] || typeColor.general}`}>
                                {result.domain}
                            </span>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Wrench size={16} className="text-gray-400" />
                                <p className="text-xs text-gray-400">Tools Discovered</p>
                            </div>
                            <p className="text-3xl font-bold">{result.tools.length}</p>
                            <p className="text-xs text-gray-400 mt-1">MCP tools available</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 size={16} className="text-gray-400" />
                                <p className="text-xs text-gray-400">Recommended Benchmarks</p>
                            </div>
                            <p className="text-3xl font-bold">{result.recommended_benchmarks.length}</p>
                            <p className="text-xs text-gray-400 mt-1">Auto-selected for you</p>
                        </div>
                    </div>

                    {result.tools.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-sm font-semibold mb-3">Discovered Tools</p>
                            <div className="space-y-2">
                                {result.tools.map((tool, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                        <Zap size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">{tool.name}</p>
                                            {tool.description && <p className="text-xs text-gray-400 mt-0.5">{tool.description}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {result.recommended_benchmarks.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-sm font-semibold mb-3">Recommended Benchmarks</p>
                            <div className="space-y-2">
                                {result.recommended_benchmarks.map((b, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle size={14} className="text-green-500" />
                                            <div>
                                                <p className="text-sm font-medium">{b.name}</p>
                                                <p className="text-xs text-gray-400 capitalize">{b.domain}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                            {b.relevance_score > 2 ? 'High Match' : b.relevance_score > 0 ? 'Good Match' : 'General'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {connected && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <p className="text-sm text-green-700 font-medium">✅ MCP Server Connected!</p>
                            <p className="text-xs text-green-600 mt-1">
                                Go to Benchmarks → select a recommended benchmark → Run it. AgentOS will test your agent through the MCP connection automatically.
                            </p>
                        </div>
                    )}
                </>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700 font-medium">How it works</p>
                <p className="text-xs text-blue-600 mt-1">
                    Paste your MCP Server URL → AgentOS discovers all tools automatically → Detects agent type → Recommends the right benchmarks → Run tests → Get Reliability Score + PDF Report.
                </p>
            </div>
        </div>
    )
}