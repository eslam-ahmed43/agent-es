import { supabaseAdmin } from '../lib/supabase'
import { callAI } from '../lib/ai-router'

const DEFAULT_TOOL_TESTS = [
    {
        name: 'Simple Calculator',
        description: 'Agent should use calculator for math',
        difficulty: 'easy',
        available_tools: [
            { name: 'calculator', description: 'Performs math calculations', params: ['expression'] },
            { name: 'search', description: 'Searches the web', params: ['query'] },
            { name: 'email', description: 'Sends an email', params: ['to', 'subject', 'body'] }
        ],
        conversation: [{ role: 'user', content: 'What is 347 multiplied by 89?' }],
        expected_tool: 'calculator',
        expected_params: { expression: '347 * 89' },
        expected_call_count: 1
    },
    {
        name: 'Web Search Selection',
        description: 'Agent should use search for current info',
        difficulty: 'easy',
        available_tools: [
            { name: 'calculator', description: 'Performs math calculations', params: ['expression'] },
            { name: 'search', description: 'Searches the web for current information', params: ['query'] },
            { name: 'database', description: 'Queries internal database', params: ['sql'] }
        ],
        conversation: [{ role: 'user', content: 'What is the current weather in Cairo?' }],
        expected_tool: 'search',
        expected_params: { query: 'weather Cairo' },
        expected_call_count: 1
    },
    {
        name: 'No Tool Needed',
        description: 'Agent should NOT use any tool for simple greeting',
        difficulty: 'medium',
        available_tools: [
            { name: 'calculator', description: 'Performs math calculations', params: ['expression'] },
            { name: 'search', description: 'Searches the web', params: ['query'] },
            { name: 'email', description: 'Sends an email', params: ['to', 'subject', 'body'] }
        ],
        conversation: [{ role: 'user', content: 'Hello! How are you today?' }],
        expected_tool: 'none',
        expected_params: {},
        expected_call_count: 0
    },
    {
        name: 'Email Tool Selection',
        description: 'Agent selects email tool correctly',
        difficulty: 'medium',
        available_tools: [
            { name: 'calculator', description: 'Performs math calculations', params: ['expression'] },
            { name: 'search', description: 'Searches the web', params: ['query'] },
            { name: 'email', description: 'Sends an email to a recipient', params: ['to', 'subject', 'body'] },
            { name: 'calendar', description: 'Creates calendar events', params: ['title', 'date', 'time'] }
        ],
        conversation: [{ role: 'user', content: 'Send a message to ahmed@example.com saying the meeting is confirmed.' }],
        expected_tool: 'email',
        expected_params: { to: 'ahmed@example.com' },
        expected_call_count: 1
    },
    {
        name: 'Database Query',
        description: 'Agent uses database for internal data lookup',
        difficulty: 'hard',
        available_tools: [
            { name: 'search', description: 'Searches the web', params: ['query'] },
            { name: 'database', description: 'Queries internal customer database', params: ['sql'] },
            { name: 'email', description: 'Sends an email', params: ['to', 'subject', 'body'] },
            { name: 'crm', description: 'Updates CRM records', params: ['customer_id', 'field', 'value'] }
        ],
        conversation: [{ role: 'user', content: 'Look up customer ID 12345 in our system and tell me their order history.' }],
        expected_tool: 'database',
        expected_params: { sql: 'SELECT * FROM orders WHERE customer_id = 12345' },
        expected_call_count: 1
    },
    {
        name: 'Infinite Loop Detection',
        description: 'Agent should not call same tool repeatedly',
        difficulty: 'expert',
        available_tools: [
            { name: 'search', description: 'Searches the web', params: ['query'] },
            { name: 'calculator', description: 'Performs math', params: ['expression'] }
        ],
        conversation: [
            { role: 'user', content: 'Search for the price of gold and calculate how much 5kg would cost.' }
        ],
        expected_tool: 'search',
        expected_params: { query: 'gold price per kg' },
        expected_call_count: 2
    }
]

export const seedToolTests = async (agent_id: string): Promise<void> => {
    const { data: existing } = await supabaseAdmin
        .from('tool_tests')
        .select('id')
        .eq('agent_id', agent_id)

    if (existing && existing.length > 0) return

    const toInsert = DEFAULT_TOOL_TESTS.map(t => ({ ...t, agent_id }))
    const { error } = await supabaseAdmin.from('tool_tests').insert(toInsert)
    if (error) throw new Error(`Failed to seed tool tests: ${error.message}`)
}

export const getToolTests = async (agent_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('tool_tests')
        .select('*')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
}

export const runToolTest = async (tool_test_id: string, agent_id: string): Promise<string> => {
    const { data: test } = await supabaseAdmin
        .from('tool_tests')
        .select('*')
        .eq('id', tool_test_id)
        .single()

    if (!test) throw new Error('Tool test not found')

    const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', agent_id)
        .single()

    if (!agent) throw new Error('Agent not found')

    const tools = test.available_tools as any[]
    const toolsDescription = tools.map(t =>
        `- ${t.name}: ${t.description} (params: ${t.params.join(', ')})`
    ).join('\n')

    const systemPrompt = `${agent.system_prompt || 'You are a helpful assistant.'}

You have access to these tools:
${toolsDescription}

When you need to use a tool, respond with EXACTLY this JSON format:
{"tool": "tool_name", "params": {"param1": "value1"}, "reason": "why you chose this tool"}

If no tool is needed, respond with:
{"tool": "none", "params": {}, "reason": "why no tool is needed"}

Always respond with valid JSON only.`

    const conversation = test.conversation as { role: string; content: string }[]

    const providers = [
        { provider: 'groq' as const, model: 'meta-llama/llama-4-scout-17b-16e-instruct' },
        { provider: 'openrouter' as const, model: 'meta-llama/llama-3.3-70b-instruct' },
        { provider: 'gemini' as const, model: 'gemini-2.5-flash' }
    ]

    let raw_response = ''
    for (const { provider, model } of providers) {
        try {
            const res = await callAI({
                provider, model,
                messages: [
                    { role: 'system' as const, content: systemPrompt },
                    ...conversation.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
                ],
                temperature: 0.1,
                max_tokens: 500
            })
            raw_response = res.content
            break
        } catch { continue }
    }

    let tool_selected = 'none'
    let params_used: Record<string, any> = {}
    let explanation = ''
    let call_count = 0

    try {
        const clean = raw_response.replace(/```json/g, '').replace(/```/g, '').trim()
        const jsonMatch = clean.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            tool_selected = parsed.tool || 'none'
            params_used = parsed.params || {}
            explanation = parsed.reason || ''
            call_count = tool_selected === 'none' ? 0 : 1
        }
    } catch {
        tool_selected = 'none'
    }

    const expected_tool = test.expected_tool as string
    const expected_params = test.expected_params as Record<string, any>

    const correct_tool = tool_selected === expected_tool
    const correct_count = call_count === test.expected_call_count

    let correct_params = false
    if (correct_tool && expected_tool !== 'none') {
        const expectedKeys = Object.keys(expected_params)
        correct_params = expectedKeys.every(key => {
            const expectedVal = expected_params[key]?.toString().toLowerCase()
            const actualVal = params_used[key]?.toString().toLowerCase()
            return actualVal && (actualVal.includes(expectedVal) || expectedVal.includes(actualVal))
        })
    } else if (expected_tool === 'none' && tool_selected === 'none') {
        correct_params = true
    }

    const overall_score =
        (correct_tool ? 0.5 : 0) +
        (correct_params ? 0.3 : 0) +
        (correct_count ? 0.2 : 0)

    const passed = overall_score >= 0.7

    const { data: result, error } = await supabaseAdmin
        .from('tool_results')
        .insert({
            tool_test_id,
            agent_id,
            tool_selected,
            params_used,
            call_count,
            correct_tool,
            correct_params,
            correct_count,
            overall_score,
            passed,
            agent_response: raw_response,
            explanation
        })
        .select()
        .single()

    if (error || !result) throw new Error('Failed to save tool result')
    return result.id
}

export const getToolResults = async (agent_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('tool_results')
        .select('*, tool_tests(name, difficulty, expected_tool, available_tools)')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
}

export const getToolSummary = async (agent_id: string) => {
    const { data } = await supabaseAdmin
        .from('tool_results')
        .select('*')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })
        .limit(20)

    if (!data || data.length === 0) return null

    const avg = (key: string) =>
        data.reduce((s, r) => s + ((r as any)[key] ? 1 : 0), 0) / data.length

    return {
        total_tests: data.length,
        tool_accuracy: parseFloat((avg('correct_tool') * 100).toFixed(1)),
        param_accuracy: parseFloat((avg('correct_params') * 100).toFixed(1)),
        count_accuracy: parseFloat((avg('correct_count') * 100).toFixed(1)),
        overall_score: parseFloat((data.reduce((s, r) => s + (r.overall_score || 0), 0) / data.length * 100).toFixed(1)),
        passed_count: data.filter(r => r.passed).length,
        failed_count: data.filter(r => !r.passed).length
    }
}