'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowRight, CheckCircle, Zap, Shield, TrendingUp, Play, Bot, BarChart3 } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.push('/dashboard/overview')
      else setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div>
          <span className="text-lg font-bold">AgentOS</span>
          <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Beta</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/login')}
            className="text-sm text-gray-600 hover:text-black transition">
            Sign in
          </button>
          <button onClick={() => router.push('/register')}
            className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">
            Get Started
          </button>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full mb-6">
          <Zap size={12} className="text-yellow-500" />
          CI/CD for AI Agents
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
          Test your AI Agent<br />
          <span className="text-gray-400">before it fails in production</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10">
          AgentOS automatically tests your LLM or AI Agent against real-world scenarios,
          detects weaknesses, and improves your prompts — before you go live.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => router.push('/register')}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition text-sm">
            Start Testing <ArrowRight size={16} />
          </button>
          <button onClick={() => router.push('/login')}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition text-sm">
            <Play size={14} /> Sign In
          </button>
        </div>
      </section>

      <section className="border-y border-gray-100 py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[
            { value: '4', label: 'Benchmark Categories' },
            { value: 'AI + Human', label: 'Scenario Generation' },
            { value: 'End-to-End', label: 'Agent Evaluation' },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">How it works</p>
        <h2 className="text-3xl font-bold text-center mb-12">From Agent to Production-Ready in minutes</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', icon: Bot, title: 'Add your Agent', desc: 'Connect any LLM via API, OpenAI SDK, REST, or MCP' },
            { step: '02', icon: Play, title: 'Run Benchmarks', desc: 'Scenarios covering safety, attacks, personas, and edge cases' },
            { step: '03', icon: BarChart3, title: 'Get Analysis', desc: 'Reliability Score, strengths, weaknesses, full explainability' },
            { step: '04', icon: TrendingUp, title: 'Auto Improve', desc: 'AI fixes your system prompt and verifies the improvement' },
          ].map((s, i) => {
            const Icon = s.icon
            return (
              <div key={i} className="relative">
                {i < 3 && <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gray-200 z-0" />}
                <div className="relative z-10 bg-white border border-gray-100 rounded-xl p-5 hover:border-gray-300 transition">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-gray-300">{s.step}</span>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Icon size={16} className="text-gray-700" />
                    </div>
                  </div>
                  <p className="font-semibold text-sm mb-1">{s.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Features</p>
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need to ship reliable AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: 'Security Testing', desc: 'Jailbreak, prompt injection, manipulation attacks — tested automatically' },
              { icon: TrendingUp, title: 'Auto Improve', desc: 'AI analyzes failures and rewrites your system prompt to fix them' },
              { icon: BarChart3, title: 'Reliability Score', desc: 'Composite score across safety, consistency, helpfulness, and stability' },
              { icon: Bot, title: 'Memory Evaluation', desc: 'Test if your agent remembers context across long conversations' },
              { icon: Zap, title: 'Tool Calling Tests', desc: 'Verify your agent selects the right tools with the right parameters' },
              { icon: Play, title: 'Regression Suite', desc: 'Catch regressions before deployment with automated re-testing' },
            ].map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 hover:border-gray-300 transition">
                  <div className="p-2 bg-gray-50 rounded-lg w-fit mb-3">
                    <Icon size={16} className="text-gray-700" />
                  </div>
                  <p className="font-semibold text-sm mb-1">{f.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Benchmarks</p>
        <h2 className="text-3xl font-bold text-center mb-4">Real results on real models</h2>
        <p className="text-center text-gray-500 text-sm mb-10">Customer Support Benchmark — tested by AgentOS</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { model: 'Llama 4 Scout', provider: 'Groq', score: 95.5, color: 'bg-green-500' },
            { model: 'Gemini 2.5 Flash', provider: 'Google', score: 87.4, color: 'bg-blue-500' },
            { model: 'More models', provider: 'Coming soon', score: null, color: 'bg-gray-200' },
          ].map((m, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm">{m.model}</p>
                  <p className="text-xs text-gray-400">{m.provider}</p>
                </div>
                {m.score ? (
                  <span className="text-2xl font-bold">{m.score}%</span>
                ) : (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Soon</span>
                )}
              </div>
              {m.score && (
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${m.color}`} style={{ width: `${m.score}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-black text-white py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to ship reliable AI?</h2>
          <p className="text-gray-400 text-sm mb-8">
            Test your AI Agent before it fails in production.
          </p>
          <button onClick={() => router.push('/register')}
            className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-medium hover:bg-gray-100 transition mx-auto">
            Get Started <ArrowRight size={16} />
          </button>
          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-500">
            {['No setup required', '4 benchmark categories', 'Auto Improve'].map((t, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <CheckCircle size={12} className="text-green-400" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div>
            <span className="font-bold text-sm">AgentOS</span>
            <p className="text-xs text-gray-400 mt-0.5">CI/CD for AI Agents</p>
          </div>
          <p className="text-xs text-gray-400">© 2026 AgentOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}