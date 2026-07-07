'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Plus, FlaskConical, Trash2, User, AlertTriangle, Shield, MessageSquare } from 'lucide-react'

interface Scenario {
    id: string
    name: string
    type: string
    persona: string | null
    messages: any[]
    agent_id: string
    created_at: string
}

const typeIcons: Record<string, any> = { persona: User, edge_case: AlertTriangle, attack: Shield, long_conversation: MessageSquare }
const typeColors: Record<string, string> = { persona: 'text-blue-500 bg-blue-50', edge_case: 'text-yellow-500 bg-yellow-50', attack: 'text-red-500 bg-red-50', long_conversation: 'text-green-500 bg-green-50' }

export default function ScenariosPage() {
    const [scenarios, setScenarios] = useState<Scenario[]>([])
    const [agents, setAgents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [form, setForm] = useState({ name: '', type: 'persona', persona: '', expected_behavior: '', agent_id: '', user_message: '' })

    const fetchData = async () => {
        try {
            const [s, a] = await Promise.all([
                api.get<{ success: boolean; data: Scenario[] }>('/api/scenarios'),
                api.get<{ success: boolean; data: any[] }>('/api/agents')
            ])
            setScenarios(s.data || []); setAgents(a.data || [])
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    const handleCreate = async () => {
        if (!form.name.trim() || !form.agent_id) return
        setCreating(true)
        try {
            await api.post('/api/scenarios', { name: form.name, type: form.type, persona: form.persona, expected_behavior: form.expected_behavior, agent_id: form.agent_id, messages: [{ role: 'user', content: form.user_message }] })
            setShowModal(false)
            setForm({ name: '', type: 'persona', persona: '', expected_behavior: '', agent_id: '', user_message: '' })
            fetchData()
        } catch (err) { console.error(err) } finally { setCreating(false) }
    }

    const handleDelete = async (id: string) => {
        try { await api.delete(`/api/scenarios/${id}`); fetchData() } catch (err) { console.error(err) }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Scenarios</h1>
                    <p className="text-gray-500 text-sm mt-1">Define test scenarios for your agents</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                    <Plus size={16} /> New Scenario
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : scenarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <FlaskConical size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No scenarios yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Create test scenarios to evaluate your agents</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scenarios.map(scenario => {
                        const Icon = typeIcons[scenario.type] || FlaskConical
                        const color = typeColors[scenario.type] || 'text-gray-500 bg-gray-50'
                        return (
                            <div key={scenario.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-400 transition group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`p-2 rounded-lg shrink-0 ${color}`}><Icon size={18} /></div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold truncate">{scenario.name}</h3>
                                            <span className="text-xs text-gray-500 capitalize">{scenario.type.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(scenario.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                                {scenario.persona && <p className="text-gray-500 text-sm mt-3 line-clamp-2">Persona: {scenario.persona}</p>}
                                <div className="mt-4"><span className="text-xs text-gray-400">{scenario.messages.length} message(s)</span></div>
                            </div>
                        )
                    })}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-semibold">Create New Scenario</h2>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Angry Customer Test"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Agent</label>
                            <select value={form.agent_id} onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                                <option value="">Select an agent</option>
                                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                                <option value="persona">Persona</option>
                                <option value="edge_case">Edge Case</option>
                                <option value="attack">Attack</option>
                                <option value="long_conversation">Long Conversation</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Persona Description</label>
                            <input type="text" value={form.persona} onChange={(e) => setForm({ ...form, persona: e.target.value })} placeholder="Angry customer who wants refund"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">User Message</label>
                            <textarea value={form.user_message} onChange={(e) => setForm({ ...form, user_message: e.target.value })} placeholder="I want my money back now!" rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Expected Behavior</label>
                            <input type="text" value={form.expected_behavior} onChange={(e) => setForm({ ...form, expected_behavior: e.target.value })} placeholder="Agent should stay calm and offer solutions"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleCreate} disabled={creating || !form.name.trim() || !form.agent_id}
                                className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}