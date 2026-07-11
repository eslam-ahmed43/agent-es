'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Activity, Plus, Loader2, CheckCircle, AlertTriangle, Play, ToggleLeft, ToggleRight } from 'lucide-react'

interface Agent { id: string; name: string }
interface Benchmark { id: string; name: string; domain: string }
interface Monitor {
    id: string
    agent_id: string
    benchmark_id: string
    schedule: string
    enabled: boolean
    last_run: string | null
    last_score: number | null
    alert_email: string | null
    benchmarks: { name: string; domain: string }
    agents: { name: string }
}
interface MonitorResult {
    id: string
    score: number
    previous_score: number
    drift: number
    drift_detected: boolean
    created_at: string
}

export default function MonitorPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
    const [monitors, setMonitors] = useState<Monitor[]>([])
    const [results, setResults] = useState<MonitorResult[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [running, setRunning] = useState<string | null>(null)
    const [form, setForm] = useState({ agent_id: '', benchmark_id: '', schedule: 'daily', alert_email: '', alert_threshold: 0.1 })

    const fetchAll = async (agent_id: string) => {
        try {
            const [monitorsRes, resultsRes] = await Promise.all([
                api.get<{ success: boolean; data: Monitor[] }>(`/api/monitor/${agent_id}`),
                api.get<{ success: boolean; data: MonitorResult[] }>(`/api/monitor/results/${agent_id}`)
            ])
            setMonitors(monitorsRes.data || [])
            setResults(resultsRes.data || [])
        } catch (err) { console.error(err) }
    }

    useEffect(() => {
        Promise.all([
            api.get<{ success: boolean; data: Agent[] }>('/api/agents'),
            api.get<{ success: boolean; data: Benchmark[] }>('/api/benchmarks')
        ]).then(([agentsRes, benchRes]) => {
            setAgents(agentsRes.data || [])
            setBenchmarks(benchRes.data || [])
            if (agentsRes.data?.length > 0) {
                setSelectedAgent(agentsRes.data[0].id)
                setForm(f => ({ ...f, agent_id: agentsRes.data[0].id }))
                fetchAll(agentsRes.data[0].id)
            }
        }).catch(console.error)
    }, [])

    const handleCreate = async () => {
        setCreating(true)
        try {
            await api.post('/api/monitor', form)
            setShowModal(false)
            fetchAll(selectedAgent)
        } catch (err) { console.error(err) } finally { setCreating(false) }
    }

    const handleToggle = async (monitor_id: string, enabled: boolean) => {
        try {
            await api.post('/api/monitor/toggle', { monitor_id, enabled: !enabled })
            fetchAll(selectedAgent)
        } catch (err) { console.error(err) }
    }

    const handleRun = async (monitor_id: string) => {
        setRunning(monitor_id)
        try {
            await api.post('/api/monitor/run', { monitor_id })
            fetchAll(selectedAgent)
        } catch (err) { console.error(err) } finally { setRunning(null) }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Live Monitor</h1>
                    <p className="text-gray-500 text-sm mt-1">Automatically test your agent daily and get alerts when reliability drops</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selectedAgent} onChange={(e) => { setSelectedAgent(e.target.value); fetchAll(e.target.value) }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={() => { setShowModal(true); setForm(f => ({ ...f, agent_id: selectedAgent })) }}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                        <Plus size={14} /> New Monitor
                    </button>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700 font-medium">How Live Monitor works</p>
                <p className="text-xs text-blue-600 mt-1">
                    Set up a monitor → AgentOS runs your benchmark automatically every day → If reliability drops below your threshold → You get an email alert instantly.
                </p>
            </div>

            {monitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Activity size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No monitors yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Click "New Monitor" to start continuous monitoring</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {monitors.map(monitor => (
                        <div key={monitor.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium">{monitor.benchmarks?.name}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${monitor.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {monitor.enabled ? 'Active' : 'Paused'}
                                    </span>
                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{monitor.schedule}</span>
                                </div>
                                <p className="text-xs text-gray-400">
                                    {monitor.last_run ? `Last run: ${new Date(monitor.last_run).toLocaleString()}` : 'Never run'}
                                    {monitor.last_score !== null && ` • Score: ${(monitor.last_score * 100).toFixed(1)}%`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => handleRun(monitor.id)} disabled={running === monitor.id}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50 transition disabled:opacity-50">
                                    {running === monitor.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                    Run Now
                                </button>
                                <button onClick={() => handleToggle(monitor.id, monitor.enabled)}
                                    className="text-gray-400 hover:text-black transition">
                                    {monitor.enabled ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {results.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <p className="text-sm font-semibold">Recent Monitor Results</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {results.slice(0, 10).map(result => (
                            <div key={result.id} className="p-4 flex items-center gap-4">
                                {result.drift_detected
                                    ? <AlertTriangle size={16} className="text-red-500 shrink-0" />
                                    : <CheckCircle size={16} className="text-green-500 shrink-0" />}
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{(result.score * 100).toFixed(1)}%</p>
                                    <p className="text-xs text-gray-400">{new Date(result.created_at).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xs font-medium ${result.drift_detected ? 'text-red-500' : 'text-gray-400'}`}>
                                        {result.drift_detected ? `⚠ Drift: ${(result.drift * 100).toFixed(1)}%` : 'Stable'}
                                    </p>
                                    <p className="text-xs text-gray-400">prev: {(result.previous_score * 100).toFixed(1)}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
                        <h2 className="text-lg font-semibold">New Monitor</h2>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Benchmark</label>
                            <select value={form.benchmark_id} onChange={(e) => setForm({ ...form, benchmark_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                                <option value="">Select benchmark</option>
                                {benchmarks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Schedule</label>
                            <select value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="hourly">Hourly</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Alert Email</label>
                            <input type="email" value={form.alert_email} onChange={(e) => setForm({ ...form, alert_email: e.target.value })}
                                placeholder="you@example.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Alert Threshold (drop %)</label>
                            <input type="number" min={1} max={50} value={form.alert_threshold * 100}
                                onChange={(e) => setForm({ ...form, alert_threshold: parseInt(e.target.value) / 100 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                            <p className="text-xs text-gray-400">Send alert if score drops by this % or more</p>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button onClick={handleCreate} disabled={creating || !form.benchmark_id}
                                className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
                                {creating ? 'Creating...' : 'Create Monitor'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}