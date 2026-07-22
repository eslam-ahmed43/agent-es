import { createAdapter } from '../lib/adapters'
import { ExecutionContract, ExecutionResult } from '../lib/contracts'
import { supabaseAdmin } from '../lib/supabase'
import { GeminiJudge } from '../lib/judges/gemini.judge'

const judge = new GeminiJudge()

const clamp = (val: number, min = 0, max = 1): number => Math.max(min, Math.min(max, val))

const safeScore = (judgeScore: any) => {
    if (!judgeScore) return null
    return {
        ...judgeScore,
        overall: clamp(judgeScore.overall || 0),
        safety: clamp(judgeScore.safety || 0),
        relevance: clamp(judgeScore.relevance || 0),
        consistency: clamp(judgeScore.consistency || 0),
        helpfulness: clamp(judgeScore.helpfulness || 0)
    }
}

export const executeScenario = async (contract: ExecutionContract): Promise<ExecutionResult> => {
    const started_at = new Date().toISOString()

    const { data: agent } = await supabaseAdmin
        .from('agents').select('*').eq('id', contract.agent_id).single()

    if (!agent) {
        return {
            run_id: contract.run_id,
            scenario_id: contract.scenario_id,
            success: false,
            error: 'Agent not found',
            started_at,
            completed_at: new Date().toISOString()
        }
    }

    const provider = agent.provider || 'groq'
    const model = agent.model || 'meta-llama/llama-4-scout-17b-16e-instruct'
    const temperature = agent.temperature || 0.7
    const max_tokens = agent.max_tokens || 1500

    const adapter = createAdapter({
        type: agent.type,
        endpoint_url: agent.endpoint_url || undefined,
        api_key: agent.api_key_encrypted || undefined,
        model,
        system_prompt: agent.system_prompt || 'You are a helpful assistant.',
        provider: provider as any,
        temperature,
        max_tokens
    })

    try {
        const response = await adapter.execute({
            ...contract.request,
            system_prompt: agent.system_prompt || 'You are a helpful assistant.',
            temperature,
            max_tokens
        })
        return {
            run_id: contract.run_id,
            scenario_id: contract.scenario_id,
            success: true,
            response,
            started_at,
            completed_at: new Date().toISOString()
        }
    } catch (err) {
        console.error('Scenario execution error:', err)
        return {
            run_id: contract.run_id,
            scenario_id: contract.scenario_id,
            success: false,
            error: err instanceof Error ? err.message : 'Execution failed',
            started_at,
            completed_at: new Date().toISOString()
        }
    }
}

export const executeRun = async (
    run_id: string,
    agent_id: string,
    scenario_ids: string[]
): Promise<void> => {
    const { data: agent } = await supabaseAdmin
        .from('agents').select('*').eq('id', agent_id).single()

    const provider = agent?.provider || 'groq'
    const model = agent?.model || 'meta-llama/llama-4-scout-17b-16e-instruct'

    await supabaseAdmin.from('runs').update({
        status: 'running',
        started_at: new Date().toISOString(),
        total_scenarios: scenario_ids.length
    }).eq('id', run_id)

    let completed = 0
    let total_score = 0

    for (const scenario_id of scenario_ids) {
        const { data: runCheck } = await supabaseAdmin
            .from('runs').select('cancelled, status').eq('id', run_id).single()

        if (runCheck?.cancelled || runCheck?.status === 'failed') {
            console.log(`Run ${run_id} was cancelled`)
            return
        }

        const { data: scenario } = await supabaseAdmin
            .from('scenarios').select('*').eq('id', scenario_id).single()

        if (!scenario) continue

        const trace_started = new Date().toISOString()

        const contract: ExecutionContract = {
            run_id, agent_id, scenario_id,
            request: {
                messages: (scenario.messages || []).filter((m: any) =>
                    m.role === 'user' || m.role === 'assistant'
                ),
                temperature: agent?.temperature || 0.7,
                max_tokens: agent?.max_tokens || 1500
            },
            timeout: 30000,
            retry: 2
        }

        const result = await executeScenario(contract)
        completed++

        let rawJudgeScore = null
        if (result.success && result.response?.content) {
            try {
                rawJudgeScore = await judge.evaluate({
                    scenario_name: scenario.name,
                    persona: scenario.persona,
                    expected_behavior: scenario.expected_behavior || '',
                    messages: scenario.messages,
                    agent_response: result.response.content
                })
            } catch (err) {
                console.error('Judge evaluation failed:', err)
            }
        }

        const judgeScore = safeScore(rawJudgeScore)
        const passed = judgeScore ? judgeScore.passed : (result.success && !!result.response?.content)
        const overall_score = judgeScore ? judgeScore.overall : (result.success ? 0.5 : 0)
        total_score += overall_score

        const { data: evaluation } = await supabaseAdmin.from('evaluations').insert({
            run_id,
            scenario_id,
            agent_response: result.response?.content || null,
            syntax_score: judgeScore?.safety || (result.success ? 1.0 : 0.0),
            safety_score: judgeScore?.safety || (result.success ? 1.0 : 0.0),
            relevance_score: judgeScore?.relevance || (result.success ? 1.0 : 0.0),
            overall_score,
            passed,
            failure_reason: judgeScore?.failure_reason || result.error || null,
            raw_response: {
                response: result.response?.raw || null,
                judge: judgeScore || null,
                strengths: judgeScore?.strengths || [],
                weaknesses: judgeScore?.weaknesses || [],
                suggestions: judgeScore?.suggestions || [],
                explanation: judgeScore?.explanation || null,
                helpfulness: judgeScore?.helpfulness || 0,
                consistency: judgeScore?.consistency || 0,
                provider,
                model
            }
        }).select().single()

        if (evaluation) {
            await supabaseAdmin.from('execution_traces').insert({
                evaluation_id: evaluation.id,
                run_id, scenario_id,
                adapter_type: agent?.type || 'prompt_only',
                provider,
                model,
                input_messages: scenario.messages,
                output_messages: result.response?.content
                    ? [{ role: 'assistant', content: result.response.content }]
                    : [],
                tool_calls: [], tool_results: [], intermediate_steps: [],
                latency: result.response?.latency || 0,
                tokens_used: result.response?.tokens_used || 0,
                status: result.success ? 'completed' : 'failed',
                error_message: result.error || null,
                started_at: trace_started,
                finished_at: new Date().toISOString()
            })
        }

        await supabaseAdmin.from('runs').update({
            completed_scenarios: completed,
            overall_score: total_score / completed
        }).eq('id', run_id)
    }

    await supabaseAdmin.from('runs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        overall_score: completed > 0 ? total_score / completed : 0
    }).eq('id', run_id)
}

export const healthCheckAgent = async (agent_id: string) => {
    const { data: agent } = await supabaseAdmin
        .from('agents').select('*').eq('id', agent_id).single()

    if (!agent) throw new Error('Agent not found')

    const provider = agent.provider || 'groq'
    const model = agent.model || 'meta-llama/llama-4-scout-17b-16e-instruct'

    const adapter = createAdapter({
        type: agent.type,
        endpoint_url: agent.endpoint_url || undefined,
        api_key: agent.api_key_encrypted || undefined,
        model,
        system_prompt: agent.system_prompt || 'You are a helpful assistant.',
        provider: provider as any
    })

    return adapter.health()
}