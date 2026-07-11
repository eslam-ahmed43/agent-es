'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Link2, Plus, Trash2, CheckCircle, XCircle, Loader2, Zap } from 'lucide-react'

interface Agent { id: string; name: string }
interface Connector {
    id: string
    connector_type: string
    config: Record<string, any>
    status: string
    last_tested: string | null
    created_at: string
}

const CONNECTOR_TYPES = [
    { value: 'mcp', label: 'MCP Server', icon: '🔌', fields: ['url'] },
    { value: 'rest', label: 'REST API', icon: '🌐', fields: ['url', 'api_key'] },
    { value: 'openapi', label: 'OpenAPI', icon: '📋', fields: ['spec_url', 'api_key'] },
    { value: 'n8n', label: 'n8n Workflow', icon: '⚡', fields: ['webhook_url'] },
    { value: 'openai_sdk', label: 'OpenAI Agents SDK', icon: '🤖', fields: ['api_key', 'assistant_id'] },
    { value: 'langraph', label: 'LangGraph', icon: '🔗', fields: ['url', 'api_key'] },
    { value: 'crewai', label: 'CrewAI', icon: '👥', fields: ['url', 'api_key'] }
]

export default function ConnectorsPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [connectors, setConnectors] = useState<Connector[]>([])
    const [showModal, setShowModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [testing, setTesting] = useState<string | null>(null)
    const [form, setForm] = useState({ connector_type: 'mcp', url: '', api_key: '', webhook_url: '', spec_url: '', assistant_id: '' })

    const fetchConnectors = async (agent_id: string) => {
        try {
            const res = await api.get<{ success: boolean; data: Connector[] }>(`/api/connectors/${agent_id}`)
            setConnectors(res.data || [])
        } catch { setConnectors([]) }
    }

    useEffect(() => {
        api.get<{ success: boolean; data: Agent[] }>('/api/agents')
            .then(res => {
                setAgents(res.data || [])
                if (res.data?.length > 0) {
                    setSelectedAgent(res.data[0].id)
                    fetchConnectors(res.data[0].id)
                }
            }).catch(console.error)
    }, [])

    const handleCreate = async () => {
        setCreating(true)
        try {
            const config: Record<string, any> = {}
            if (form.url) config.url = form.url
            if (form.api_key) config.api_key = form.api_key
            if (form.webhook_url) config.webhook_url = form.webhook_url
            if (form.spec_url) config.spec_url = form.spec_url
            if (form.assistant_id) config.assistant_id = form.assistant_id

            await api.post('/api/connectors', { agent_id: selectedAgent, connector_type: form.connector_type, config })
            setShowModal(false)
            fetchConnectors(selectedAgent)
        } catch (err) { console.error(err) } finally { setCreating(false) }
    }

    const handleTest = async (connector_id: string) => {
        setTesting(connector_id)
        try {
            await api.post('/api/connectors/test', { connector_id })
            fetchConnectors(selectedAgent)
        } catch (err) { console.error(err) } finally { setTesting(null) }
    }

    const handleDelete = async (connector_id: string) => {
        try {
            await api.delete(`/api/connectors/${connector_id}`)
            fetchConnectors(selectedAgent)
        } catch (err) { console.error(err) }
    }

    const selectedType = CONNECTOR_TYPES.find(t => t.value === form.connector_type)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Universal Connectors</h1>
                    <p className="text-gray-500 text-sm mt-1">Connect any AI Agent framework to AgentOS</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selectedAgent} onChange={(e) => { setSelectedAgent(e.target.value); fetchConnectors(e.target.value) }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                        <Plus size={14} /> Add Connector
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CONNECTOR_TYPES.map(ct => (
                    <div key={ct.value} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center">
                        <p className="text-2xl mb-1">{ct.icon}</p>
                        <p className="text-xs font-medium">{ct.label}</p>
                    </div>
                ))}
            </div>

            {connectors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Link2 size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No connectors yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Add a connector to start testing your agent</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {connectors.map(connector => {
                        const typeInfo = CONNECTOR_TYPES.find(t => t.value === connector.connector_type)
                        return (
                            <div key={connector.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                                <p className="text-2xl shrink-0">{typeInfo?.icon || '🔌'}</p>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium">{typeInfo?.label}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${connector.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {connector.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 truncate">
                                        {connector.config?.url || connector.config?.webhook_url || connector.config?.spec_url || 'No URL configured'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {connector.status === 'active'
                                        ? <CheckCircle size={14} className="text-green-500" />
                                        : <XCircle size={14} className="text-red-400" />}
                                    <button onClick={() => handleTest(connector.id)} disabled={testing === connector.id}
                                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50 transition disabled:opacity-50">
                                        {testing === connector.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                        Test
                                    </button>
                                    <button onClick={() => handleDelete(connector.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 transition">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
                        <h2 className="text-lg font-semibold">Add Connector</h2>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Framework</label>
                            <select value={form.connector_type} onChange={(e) => setForm({ ...form, connector_type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                                {CONNECTOR_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.icon} {ct.label}</option>)}
                            </select>
                        </div>
                        {selectedType?.fields.includes('url') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">URL / Endpoint</label>
                                <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                                    placeholder="https://your-agent.com/api"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                            </div>
                        )}
                        {selectedType?.fields.includes('webhook_url') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Webhook URL</label>
                                <input value={form.webhook_url} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                                    placeholder="https://your-n8n.com/webhook/..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                            </div>
                        )}
                        {selectedType?.fields.includes('spec_url') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">OpenAPI Spec URL</label>
                                <input value={form.spec_url} onChange={(e) => setForm({ ...form, spec_url: e.target.value })}
                                    placeholder="https://api.example.com/openapi.json"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                            </div>
                        )}
                        {selectedType?.fields.includes('api_key') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">API Key</label>
                                <input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                                    placeholder="sk-..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                            </div>
                        )}
                        {selectedType?.fields.includes('assistant_id') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Assistant ID</label>
                                <input value={form.assistant_id} onChange={(e) => setForm({ ...form, assistant_id: e.target.value })}
                                    placeholder="asst_..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                            </div>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button onClick={handleCreate} disabled={creating}
                                className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
                                {creating ? 'Adding...' : 'Add Connector'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}