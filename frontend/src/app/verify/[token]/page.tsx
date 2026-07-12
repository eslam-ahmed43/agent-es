'use client'

import { useEffect, useState } from 'react'

interface Certification {
    level: string
    reliability_score: number
    issued_at: string
    valid_until: string
    benchmarks_passed: { name: string; score: number }[]
    agents: { name: string; type: string; model: string }
}

const levelConfig: Record<string, { emoji: string; color: string; bg: string }> = {
    platinum: { emoji: '💎', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    gold: { emoji: '🥇', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
    silver: { emoji: '🥈', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
    bronze: { emoji: '🥉', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' }
}

export default function VerifyPage({ params }: { params: { token: string } }) {
    const [cert, setCert] = useState<Certification | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/certification/public/${params.token}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) setCert(data.data)
                else setError('Certificate not found')
            })
            .catch(() => setError('Failed to load certificate'))
            .finally(() => setLoading(false))
    }, [params.token])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full" />
        </div>
    )

    if (error || !cert) return (
        <div className="min-h-screen flex items-center justify-center text-center">
            <div>
                <p className="text-4xl mb-4">❌</p>
                <p className="text-lg font-medium">Certificate not found</p>
                <p className="text-gray-500 text-sm mt-1">This certificate may have expired or doesn't exist</p>
            </div>
        </div>
    )

    const config = levelConfig[cert.level] || levelConfig.bronze
    const isValid = new Date(cert.valid_until) > new Date()

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-4">
                <div className="text-center mb-6">
                    <p className="text-2xl font-bold">AgentOS</p>
                    <p className="text-gray-500 text-sm">AI Agent Reliability Platform</p>
                </div>

                <div className={`border-2 rounded-2xl p-8 text-center ${config.bg}`}>
                    <p className="text-6xl mb-3">{config.emoji}</p>
                    <p className={`text-2xl font-bold capitalize ${config.color}`}>{cert.level} Certified</p>
                    <p className={`text-5xl font-black mt-2 ${config.color}`}>{cert.reliability_score.toFixed(1)}%</p>
                    <p className="text-gray-500 text-sm mt-1">Reliability Score</p>

                    <div className="mt-4 p-3 bg-white/60 rounded-xl">
                        <p className="font-semibold text-gray-800">{cert.agents?.name}</p>
                        <p className="text-xs text-gray-500">{cert.agents?.model || cert.agents?.type}</p>
                    </div>

                    <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
                        <span>Issued: {new Date(cert.issued_at).toLocaleDateString()}</span>
                        <span>Valid Until: {new Date(cert.valid_until).toLocaleDateString()}</span>
                    </div>

                    <div className={`mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isValid ? '✓ Valid Certificate' : '✗ Expired'}
                    </div>
                </div>

                {cert.benchmarks_passed?.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <p className="text-sm font-semibold mb-3">Benchmarks Passed</p>
                        <div className="space-y-2">
                            {cert.benchmarks_passed.map((b, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <p className="text-sm">{b.name}</p>
                                    <p className="text-sm font-bold text-green-600">{(b.score * 100).toFixed(1)}%</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <p className="text-center text-xs text-gray-400">
                    Verified by AgentOS • agent-es-nu.vercel.app
                </p>
            </div>
        </div>
    )
}