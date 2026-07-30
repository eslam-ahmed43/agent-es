import { supabaseAdmin } from '../lib/supabase'
import { executeRun } from './execution-engine'
import { callGeneration } from '../lib/ai-router'

const waitForRun = async (run_id: string, maxAttempts = 60): Promise<void> => {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabaseAdmin
      .from('runs').select('status').eq('id', run_id).single()
    if (data?.status === 'completed' || data?.status === 'failed') return
    await new Promise(r => setTimeout(r, 3000))
  }
}

const generateAgentProfile = async (
  agent_name: string,
  benchmark_results: { name: string; domain: string; score: number; passed: number; failed: number }[]
): Promise<{ strengths: string[]; weaknesses: string[]; recommendation: string; profile: Record<string, any> }> => {
  const resultsText = benchmark_results.map(r =>
    `${r.name} (${r.domain}): ${(r.score * 100).toFixed(1)}% — ${r.passed} passed, ${r.failed} failed`
  ).join('\n')

  const prompt = `You are an AI Agent analyst. Analyze these REAL benchmark results for "${agent_name}".

ACTUAL BENCHMARK RESULTS:
${resultsText}

Based on these specific scores, provide accurate insights.

Return ONLY valid JSON:
{
  "strengths": ["specific strength based on high scores"],
  "weaknesses": ["specific weakness based on low scores"],
  "recommendation": "One sentence based on actual results: This agent scored X% on Y and is best suited for...",
  "profile": {
    "best_use_case": "based on highest scoring benchmark",
    "reliability_tier": "enterprise (>85%) | professional (70-85%) | experimental (<70%)",
    "key_capability": "based on results",
    "main_risk": "based on lowest scoring benchmark"
  }
}`

  try {
    const res = await callGeneration({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 600
    })
    const clean = res.content.replace(/```json/g, '').replace(/```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (parsed.strengths && parsed.weaknesses) return parsed
    }
  } catch (err) {
    console.error('Profile generation failed:', err)
  }

  const avgScore = benchmark_results.reduce((s, r) => s + r.score, 0) / benchmark_results.length
  const best = benchmark_results.sort((a, b) => b.score - a.score)[0]
  const worst = benchmark_results.sort((a, b) => a.score - b.score)[0]

  return {
    strengths: [`Strong performance in ${best?.name} (${(best?.score * 100).toFixed(1)}%)`],
    weaknesses: [`Needs improvement in ${worst?.name} (${(worst?.score * 100).toFixed(1)}%)`],
    recommendation: `This agent scored ${(avgScore * 100).toFixed(1)}% overall and is best suited for ${best?.domain} tasks.`,
    profile: {
      best_use_case: best?.domain || 'General',
      reliability_tier: avgScore >= 0.85 ? 'enterprise' : avgScore >= 0.70 ? 'professional' : 'experimental',
      key_capability: best?.name || 'Unknown',
      main_risk: worst?.name || 'Unknown'
    }
  }
}

export const startFullEvaluation = async (agent_id: string): Promise<string> => {
  const { data: agent } = await supabaseAdmin
    .from('agents').select('*').eq('id', agent_id).single()
  if (!agent) throw new Error('Agent not found')

  const { data: benchmarks } = await supabaseAdmin
    .from('benchmarks').select('*').order('created_at', { ascending: true })
  if (!benchmarks || benchmarks.length === 0) throw new Error('No benchmarks found')

  const { data: evaluation, error } = await supabaseAdmin
    .from('full_evaluations').insert({
      agent_id,
      status: 'running',
      benchmark_results: [],
      overall_score: 0,
      profile: {},
      strengths: [],
      weaknesses: [],
      recommendation: ''
    }).select().single()

  if (error || !evaluation) throw new Error('Failed to create evaluation')

  runFullEvaluation(evaluation.id, agent_id, agent, benchmarks).catch(err => {
    console.error('Full evaluation failed:', err)
    supabaseAdmin.from('full_evaluations').update({ status: 'failed' }).eq('id', evaluation.id)
  })

  return evaluation.id
}

const runFullEvaluation = async (
  evaluation_id: string,
  agent_id: string,
  agent: any,
  benchmarks: any[]
) => {
  const benchmark_results: any[] = []

  for (const benchmark of benchmarks) {
    console.log(`Running benchmark: ${benchmark.name}`)

    const { data: benchmarkScenarios } = await supabaseAdmin
      .from('benchmark_scenarios')
      .select('scenario_id')
      .eq('benchmark_id', benchmark.id)

    if (!benchmarkScenarios || benchmarkScenarios.length === 0) {
      console.log(`No scenarios for benchmark: ${benchmark.name}`)
      continue
    }

    const scenario_ids = benchmarkScenarios.map(bs => bs.scenario_id)

    const { data: run } = await supabaseAdmin.from('runs').insert({
      agent_id,
      project_id: agent.project_id,
      status: 'pending',
      total_scenarios: scenario_ids.length,
      completed_scenarios: 0
    }).select().single()

    if (!run) continue

    await executeRun(run.id, agent_id, scenario_ids)
    await waitForRun(run.id)

    const { data: completedRun } = await supabaseAdmin
      .from('runs').select('overall_score, completed_scenarios, status').eq('id', run.id).single()

    const { data: evaluations } = await supabaseAdmin
      .from('evaluations').select('passed').eq('run_id', run.id)

    const passed = evaluations?.filter(e => e.passed).length || 0
    const failed = (evaluations?.length || 0) - passed
    const score = completedRun?.overall_score || 0

    console.log(`Benchmark ${benchmark.name}: ${(score * 100).toFixed(1)}%`)

    benchmark_results.push({
      benchmark_id: benchmark.id,
      name: benchmark.name,
      domain: benchmark.domain,
      score,
      passed,
      failed,
      total: scenario_ids.length,
      run_id: run.id
    })

    await supabaseAdmin.from('full_evaluations').update({
      benchmark_results
    }).eq('id', evaluation_id)
  }

  if (benchmark_results.length === 0) {
    await supabaseAdmin.from('full_evaluations').update({
      status: 'failed',
      recommendation: 'No benchmark results available'
    }).eq('id', evaluation_id)
    return
  }

  const overall_score = benchmark_results.reduce((s, r) => s + r.score, 0) / benchmark_results.length
  const profile = await generateAgentProfile(agent.name, benchmark_results)

  await supabaseAdmin.from('full_evaluations').update({
    status: 'completed',
    benchmark_results,
    overall_score,
    strengths: profile.strengths,
    weaknesses: profile.weaknesses,
    recommendation: profile.recommendation,
    profile: profile.profile,
    completed_at: new Date().toISOString()
  }).eq('id', evaluation_id)

  console.log(`Full evaluation completed: ${(overall_score * 100).toFixed(1)}%`)
}

export const getFullEvaluation = async (evaluation_id: string) => {
  const { data } = await supabaseAdmin
    .from('full_evaluations').select('*').eq('id', evaluation_id).single()
  return data
}

export const getAgentEvaluations = async (agent_id: string) => {
  const { data } = await supabaseAdmin
    .from('full_evaluations').select('*').eq('agent_id', agent_id)
    .order('created_at', { ascending: false }).limit(5)
  return data || []
}