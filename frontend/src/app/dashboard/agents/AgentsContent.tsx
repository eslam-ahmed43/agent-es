'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Plus, Bot, Trash2, Globe, MessageSquare, Database, Wrench, Zap } from 'lucide-react'

interface Agent {
    id: string
    name: string
    description: string | null
    type: string
    model: string | null
    version: string
    created_at: string
}

const typeIcons: Record<string, any> = { api: Globe, openai_compatible: Zap, prompt_only: MessageSquare, rag: Database, tool_calling: Wrench }
const typeLabels: Record<string, string> = { api: 'API Endpoint', openai_compatible: 'OpenAI Compatible', prompt_only: 'Prompt Only', rag: 'RAG Agent', tool_calling: 'Tool Calling' }

export default function AgentsContent() {
    const searchParams = useSearchParams()
    const projectId = searchParams.get('project_id')
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [form, setForm] = useState({ name: '', description: '', type: 'prompt_only', system_prompt: '', endpoint_url: '', api_key: '', model: '', domain: '' })

    const fetchAgents = async () => {
        try {
            const endpoint = projectId ? `/api/agents?project_id=${projectId}` : '/api/agents'
            const res = await api.get<{ success: boolean; data: Agent[] }>(endpoint)
            setAgents(res.data || [])
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    useEffect(() => { fetchAgents() }, [projectId])

    const handleCreate = async () => {
        if (!form.name.trim() || !projectId) return
        setCreating(true)
        try {
            await api.post('/api/agents', { ...form, project_id: projectId })
            setShowModal(false)
            setForm({ name: '', description: '', type: 'prompt_only', system_prompt: '', endpoint_url: '', api_key: '', model: '', domain: '' })
            fetchAgents()
        } catch (err) { console.error(err) } finally { setCreating(false) }
    }

    const handleDelete = async (id: string) => {
        try { await api.delete(`/api/agents/${id}`); fetchAgents() } catch (err) { console.error(err) }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Agents</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage and test your AI agents</p>
                </div>
                {projectId && (
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                        <Plus size={16} /> New Agent
                    </button>
                )}
            </div>

            {!projectId && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                    Select a project first to view its agents.
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : agents.length === 0 && projectId ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Bot size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No agents yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Add your first AI agent to start testing</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map(agent => {
                        const Icon = typeIcons[agent.type] || Bot
                        return (
                            <div key={agent.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-400 transition group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="p-2 bg-gray-100 rounded-lg shrink-0"><Icon size={18} /></div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold truncate">{agent.name}</h3>
                                            <span className="text-xs text-gray-500">{typeLabels[agent.type]}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(agent.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                                {agent.description && <p className="text-gray-500 text-sm mt-3 line-clamp-2">{agent.description}</p>}
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-md">v{agent.version}</span>
                                    {agent.model && <span className="text-xs text-gray-400">{agent.model}</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-semibold">Add New Agent</h2>
                        {[
                            { label: 'Name', key: 'name', type: 'text', placeholder: 'Customer Support Agent' },
                            { label: 'Domain', key: 'domain', type: 'text', placeholder: 'customer-support, sales...' },
                            { label: 'Model', key: 'model', type: 'text', placeholder: 'gemini-2.0-flash, gpt-4o...' },
                        ].map(field => (
                            <div key={field.key} className="space-y-2">
                                <label className="text-sm font-medium">{field.label}</label>
                                <input type={field.type} value={(form as any)[field.key]}
                                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                                    placeholder={field.placeholder}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                            </div>
                        ))}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                                <option value="prompt_only">Prompt Only</option>
                                <option value="api">API Endpoint</option>
                                <option value="openai_compatible">OpenAI Compatible</option>
                                <option value="rag">RAG Agent</option>
                                <option value="tool_calling">Tool Calling</option>
                            </select>
                        </div>
                        {(form.type === 'api' || form.type === 'openai_compatible') && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Endpoint URL</label>
                                    <input type="text" value={form.endpoint_url}
                                        onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })}
                                        placeholder="https://api.example.com/chat"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">API Key</label>
                                    <input type="password" value={form.api_key}
                                        onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                                        placeholder="sk-..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                                </div>
                            </>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">System Prompt</label>
                            <textarea value={form.system_prompt}
                                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                                placeholder="You are a helpful assistant..." rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="What does this agent do?" rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleCreate} disabled={creating || !form.name.trim()}
                                className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
                                {creating ? 'Adding...' : 'Add Agent'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}