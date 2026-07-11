'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Award, Loader2, Share2, CheckCircle } from 'lucide-react'

interface Agent { id: string; name: string }
interface Certification {
    id: string
    level: string
    reliability_score: number
    issued_at: string
    valid_until: string
    share_token: string
    benchmarks_passed: { name: string; score: number }[]
}

const levelConfig: Record<string, { color: string; bg: string; emoji: string }> = {
    platinum: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', emoji: '💎' },
    gold: { color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', emoji: '🥇' },
    silver: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', emoji: '🥈' },
    bronze: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', emoji: '🥉' },
    none: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', emoji: '❌' }
}

export default function CertificationPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [cert, setCert] = useState<Certification | null>(null)
    const [loading, setLoading] = useState(false)
    const [issuing, setIssuing] = useState(false)
    const [copied, setCopied] = useState(false)

    const loadCert = async (agent_id: string) => {
        setLoading(true)
        try {
            const res = await api.get<{ success: boolean; data: Certification }>(`/api/certification/${agent_id}`)
            setCert(res.data)
        } catch { setCert(null) }
        setLoading(false)
    }

    useEffect(() => {
        api.get<{ success: boolean; data: Agent[] }>('/api/agents')
            .then(res => {
                setAgents(res.data || [])
                if (res.data?.length > 0) {
                    setSelectedAgent(res.data[0].id)
                    loadCert(res.data[0].id)
                }
            }).catch(console.error)
    }, [])

    const handleIssue = async () => {
        setIssuing(true)
        try {
            const res = await api.post<{ success: boolean; data: Certification }>('/api/certification/issue', { agent_id: selectedAgent })
            setCert(res.data)
        } catch (err: any) {
            alert(err.message || 'Certification failed')
        } finally { setIssuing(false) }
    }

    const handleCopy = () => {
        if (cert?.share_token) {
            navigator.clipboard.writeText(`${window.location.origin}/verify/${cert.share_token}`)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const config = cert ? levelConfig[cert.level] || levelConfig.none : null

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Certification</h1>
                    <p className="text-gray-500 text-sm mt-1">Get your AI Agent certified and share it with the world</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selectedAgent} onChange={(e) => { setSelectedAgent(e.target.value); loadCert(e.target.value) }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={handleIssue} disabled={issuing}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                        {issuing ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                        {issuing ? 'Certifying...' : cert ? 'Renew Certificate' : 'Get Certified'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
            ) : cert && config ? (
                <>
                    <div className={`border-2 rounded-2xl p-8 text-center ${config.bg}`}>
                        <p className="text-6xl mb-4">{config.emoji}</p>
                        <p className={`text-3xl font-bold capitalize ${config.color}`}>
                            {cert.level} Certified
                        </p>
                        <p className={`text-5xl font-black mt-2 ${config.color}`}>
                            {cert.reliability_score.toFixed(1)}%
                        </p>
                        <p className="text-gray-500 text-sm mt-2">Reliability Score</p>
                        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
                            <span>Issued: {new Date(cert.issued_at).toLocaleDateString()}</span>
                            <span>Valid Until: {new Date(cert.valid_until).toLocaleDateString()}</span>
                        </div>
                        <button onClick={handleCopy}
                            className="mt-6 flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm mx-auto hover:bg-gray-800 transition">
                            {copied ? <CheckCircle size={14} /> : <Share2 size={14} />}
                            {copied ? 'Copied!' : 'Share Certificate'}
                        </button>
                    </div>

                    {cert.benchmarks_passed?.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="text-sm font-semibold mb-3">Benchmarks Passed</p>
                            <div className="space-y-2">
                                {cert.benchmarks_passed.map((b, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle size={14} className="text-green-500" />
                                            <p className="text-sm">{b.name}</p>
                                        </div>
                                        <p className="text-sm font-bold text-green-600">{(b.score * 100).toFixed(1)}%</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Award size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No certificate yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Run at least 3 benchmarks, then click "Get Certified"</p>
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        {[
                            { level: 'Bronze', min: '50%', emoji: '🥉' },
                            { level: 'Silver', min: '70%', emoji: '🥈' },
                            { level: 'Gold', min: '85%', emoji: '🥇' },
                            { level: 'Platinum', min: '95%', emoji: '💎' }
                        ].map((l, i) => (
                            <div key={i} className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-2xl">{l.emoji}</p>
                                <p className="text-sm font-medium">{l.level}</p>
                                <p className="text-xs text-gray-400">{l.min}+</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}