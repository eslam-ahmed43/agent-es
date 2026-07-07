'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function RegisterPage() {
    const router = useRouter()
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        const supabase = createClient()
        const { error } = await supabase.auth.signUp({
            email, password,
            options: { data: { full_name: fullName } }
        })
        if (error) { setError(error.message); setLoading(false); return }
        router.push('/dashboard/projects')
    }

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-white border border-gray-200 rounded-xl shadow-lg">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">AgentOS</h1>
                <p className="text-gray-500">Create your account</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg">{error}</div>
                )}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
                <button type="submit" disabled={loading}
                    className="w-full py-2 px-4 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                    {loading ? 'Creating account...' : 'Create account'}
                </button>
            </form>
            <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/login" className="text-black font-medium hover:underline">Sign in</Link>
            </p>
        </div>
    )
}