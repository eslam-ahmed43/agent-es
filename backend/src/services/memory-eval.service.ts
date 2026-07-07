import { supabaseAdmin } from '../lib/supabase'
import { callAI } from '../lib/ai-router'
import { GeminiJudge } from '../lib/judges/gemini.judge'

const judge = new GeminiJudge()

const DEFAULT_MEMORY_TESTS = [
    {
        name: 'Name Recall Test',
        description: 'Agent must remember user name across conversation',
        test_type: 'recall',
        difficulty: 'easy',
        conversation_turns: [
            { role: 'user', content: 'Hi, my name is Ahmed and I need help with my account.' },
            { role: 'user', content: 'I placed an order yesterday.' },
            { role: 'user', content: 'By the way, what is my name?' }
        ],
        memory_checkpoints: [
            { turn: 2, check: 'Does the agent remember the name Ahmed?' }
        ],
        expected_recall: ['Ahmed', 'name']
    },
    {
        name: 'Order Details Retention',
        description: 'Agent must retain order information across multiple turns',
        test_type: 'retention',
        difficulty: 'medium',
        conversation_turns: [
            { role: 'user', content: 'I want to return order #12345 for a blue jacket I bought last week.' },
            { role: 'user', content: 'Actually, can you also check the status?' },
            { role: 'user', content: 'What was the order number I mentioned?' }
        ],
        memory_checkpoints: [
            { turn: 2, check: 'Does the agent remember order #12345?' }
        ],
        expected_recall: ['12345', 'blue jacket']
    },
    {
        name: 'Preference Memory',
        description: 'Agent remembers user preferences across conversation',
        test_type: 'preference',
        difficulty: 'medium',
        conversation_turns: [
            { role: 'user', content: 'I prefer to be contacted by email, not phone.' },
            { role: 'user', content: 'Also I am vegetarian in case food vouchers are offered.' },
            { role: 'user', content: 'How would you contact me?' }
        ],
        memory_checkpoints: [
            { turn: 2, check: 'Does agent know contact preference is email?' }
        ],
        expected_recall: ['email', 'vegetarian']
    },
    {
        name: 'Multi-fact Recall',
        description: 'Agent must recall multiple facts from early in conversation',
        test_type: 'multi_recall',
        difficulty: 'hard',
        conversation_turns: [
            { role: 'user', content: 'I am Sara, I live in Cairo, and my account number is 99887.' },
            { role: 'user', content: 'I have a problem with my internet connection for 3 days.' },
            { role: 'user', content: 'Please summarize what you know about me and my issue.' }
        ],
        memory_checkpoints: [
            { turn: 2, check: 'Agent must recall: name Sara, city Cairo, account 99887, 3 days issue' }
        ],
        expected_recall: ['Sara', 'Cairo', '99887', '3 days']
    },
    {
        name: 'Context Shift Test',
        description: 'Agent maintains context after topic change',
        test_type: 'context_shift',
        difficulty: 'hard',
        conversation_turns: [
            { role: 'user', content: 'My ticket reference is TKT-2024-001 for a billing issue.' },
            { role: 'user', content: 'Actually let me ask about something else first — what are your working hours?' },
            { role: 'user', content: 'Ok back to my original issue, what was my ticket number?' }
        ],
        memory_checkpoints: [
            { turn: 2, check: 'Agent remembers ticket number after topic shift' }
        ],
        expected_recall: ['TKT-2024-001', 'billing']
    },
    {
        name: 'Needle in Haystack',
        description: 'Agent finds specific fact buried in long conversation',
        test_type: 'needle',
        difficulty: 'expert',
        conversation_turns: [
            { role: 'user', content: 'My secret code is ALPHA-7.' },
            { role: 'user', content: 'I have been having issues with the app.' },
            { role: 'user', content: 'The loading screen freezes.' },
            { role: 'user', content: 'I tried reinstalling twice.' },
            { role: 'user', content: 'My phone is Android 13.' },
            { role: 'user', content: 'What was the secret code I gave you at the start?' }
        ],
        memory_checkpoints: [
            { turn: 5, check: 'Agent recalls ALPHA-7 from beginning of long conversation' }
        ],
        expected_recall: ['ALPHA-7']
    }
]

export const seedMemoryTests = async (agent_id: string): Promise<void> => {
    const { data: existing } = await supabaseAdmin
        .from('memory_tests')
        .select('id')
        .eq('agent_id', agent_id)

    if (existing && existing.length > 0) return

    const toInsert = DEFAULT_MEMORY_TESTS.map(t => ({ ...t, agent_id }))
    const { error } = await supabaseAdmin.from('memory_tests').insert(toInsert)
    if (error) throw new Error(`Failed to seed memory tests: ${error.message}`)
}

export const getMemoryTests = async (agent_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('memory_tests')
        .select('*')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
}

export const runMemoryTest = async (
    memory_test_id: string,
    agent_id: string
): Promise<string> => {
    const { data: test } = await supabaseAdmin
        .from('memory_tests')
        .select('*')
        .eq('id', memory_test_id)
        .single()

    if (!test) throw new Error('Memory test not found')

    const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', agent_id)
        .single()

    if (!agent) throw new Error('Agent not found')

    const turns = test.conversation_turns as { role: string; content: string }[]
    const messages: { role: 'user' | 'assistant'; content: string }[] = []
    let final_response = ''

    for (const turn of turns) {
        if (turn.role === 'user') {
            messages.push({ role: 'user', content: turn.content })

            const providers = [
                { provider: 'groq' as const, model: 'meta-llama/llama-4-scout-17b-16e-instruct' },
                { provider: 'openrouter' as const, model: 'meta-llama/llama-3.3-70b-instruct' },
                { provider: 'gemini' as const, model: 'gemini-2.5-flash' }
            ]

            let response = ''
            for (const { provider, model } of providers) {
                try {
                    const systemMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = agent.system_prompt
                        ? [{ role: 'system' as const, content: agent.system_prompt as string }, ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))]
                        : messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

                    const res = await callAI({
                        provider, model,
                        messages: systemMessages,
                        temperature: 0.3,
                        max_tokens: 500
                    })
                    response = res.content
                    break
                } catch { continue }
            }

            messages.push({ role: 'assistant', content: response })
            final_response = response
        }
    }

    const expected = test.expected_recall as string[]
    const recallHits = expected.filter(fact =>
        final_response.toLowerCase().includes(fact.toLowerCase())
    )
    const recall_score = expected.length > 0 ? recallHits.length / expected.length : 0

    const judgeScore = await judge.evaluate({
        scenario_name: test.name,
        expected_behavior: `Remember and recall: ${expected.join(', ')}`,
        messages: turns,
        agent_response: final_response
    })

    const consistency_score = judgeScore.consistency || judgeScore.overall
    const context_retention = judgeScore.relevance
    const overall_score = (recall_score * 0.5) + (consistency_score * 0.3) + (context_retention * 0.2)
    const passed = overall_score >= 0.7 && recall_score >= 0.5

    const { data: run } = await supabaseAdmin
        .from('runs')
        .insert({
            agent_id,
            project_id: agent.project_id,
            status: 'completed',
            total_scenarios: 1,
            completed_scenarios: 1,
            overall_score
        })
        .select()
        .single()

    const { data: result, error } = await supabaseAdmin
        .from('memory_results')
        .insert({
            memory_test_id,
            agent_id,
            run_id: run?.id || null,
            recall_score,
            consistency_score,
            context_retention,
            overall_score,
            passed,
            details: {
                conversation: messages,
                final_response,
                expected_recall: expected,
                recalled: recallHits,
                missed: expected.filter(f => !recallHits.includes(f)),
                judge_explanation: judgeScore.explanation
            }
        })
        .select()
        .single()

    if (error || !result) throw new Error('Failed to save memory result')
    return result.id
}

export const getMemoryResults = async (agent_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('memory_results')
        .select('*, memory_tests(name, test_type, difficulty, expected_recall)')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
}

export const getMemorySummary = async (agent_id: string) => {
    const { data } = await supabaseAdmin
        .from('memory_results')
        .select('*')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })
        .limit(20)

    if (!data || data.length === 0) return null

    const avg = (key: string) =>
        data.reduce((s, r) => s + ((r as any)[key] || 0), 0) / data.length

    return {
        total_tests: data.length,
        avg_recall: parseFloat((avg('recall_score') * 100).toFixed(1)),
        avg_consistency: parseFloat((avg('consistency_score') * 100).toFixed(1)),
        avg_retention: parseFloat((avg('context_retention') * 100).toFixed(1)),
        overall_memory_score: parseFloat((avg('overall_score') * 100).toFixed(1)),
        passed_count: data.filter(r => r.passed).length,
        failed_count: data.filter(r => !r.passed).length
    }
}