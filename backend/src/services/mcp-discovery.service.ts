import { supabaseAdmin } from '../lib/supabase'
import { callGeneration } from '../lib/ai-router'

interface MCPTool {
    name: string
    description: string
    inputSchema?: Record<string, any>
}

interface DiscoveryResult {
    tools: MCPTool[]
    agent_type: string
    domain: string
    recommended_benchmarks: string[]
    capabilities: Record<string, any>
}

const detectAgentType = async (tools: MCPTool[]): Promise<{ type: string; domain: string; benchmarks: string[] }> => {
    const toolNames = tools.map(t => t.name).join(', ')
    const toolDescriptions = tools.map(t => `${t.name}: ${t.description}`).join('\n')

    const prompt = `You are an AI Agent classifier. Based on these MCP tools, classify the agent.

TOOLS:
${toolDescriptions}

Respond with ONLY valid JSON:
{
  "agent_type": "customer_support|sales|coding|rag|data_analysis|automation|general",
  "domain": "e-commerce|healthcare|finance|education|technology|general",
  "confidence": 0.9,
  "recommended_benchmarks": ["Customer Support Benchmark", "Security Benchmark"],
  "reasoning": "brief explanation"
}`

    try {
        const res = await callGeneration({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 500
        })

        const clean = res.content.replace(/```json/g, '').replace(/```/g, '').trim()
        const jsonMatch = clean.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No JSON found')

        const parsed = JSON.parse(jsonMatch[0])
        return {
            type: parsed.agent_type || 'general',
            domain: parsed.domain || 'general',
            benchmarks: parsed.recommended_benchmarks || []
        }
    } catch {
        return { type: 'general', domain: 'general', benchmarks: ['Customer Support Benchmark'] }
    }
}

export const discoverMCPAgent = async (mcp_url: string, api_key?: string): Promise<DiscoveryResult> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (api_key) headers['Authorization'] = `Bearer ${api_key}`

    let tools: MCPTool[] = []

    try {
        const listRes = await fetch(`${mcp_url}/mcp`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/list',
                params: {}
            })
        })

        if (listRes.ok) {
            const data = await listRes.json() as any
            tools = data?.result?.tools || []
        }
    } catch {
        tools = []
    }

    if (tools.length === 0) {
        try {
            const initRes = await fetch(`${mcp_url}/mcp`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'initialize',
                    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'AgentOS', version: '1.0' } }
                })
            })

            if (initRes.ok) {
                const initData = await initRes.json() as any
                const serverCaps = initData?.result?.capabilities || {}

                const listRes2 = await fetch(`${mcp_url}/mcp`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
                })

                if (listRes2.ok) {
                    const listData = await listRes2.json() as any
                    tools = listData?.result?.tools || []
                }
            }
        } catch { }
    }

    const { type, domain, benchmarks } = await detectAgentType(tools)

    return {
        tools,
        agent_type: type,
        domain,
        recommended_benchmarks: benchmarks,
        capabilities: {
            tool_count: tools.length,
            tool_names: tools.map(t => t.name),
            supports_streaming: false,
            protocol: 'MCP 2024-11-05'
        }
    }
}

export const saveMCPSession = async (
    agent_id: string,
    mcp_url: string,
    discovery: DiscoveryResult
): Promise<void> => {
    await supabaseAdmin.from('mcp_sessions').upsert({
        agent_id,
        mcp_url,
        tools_discovered: discovery.tools,
        capabilities: discovery.capabilities,
        agent_type_detected: discovery.agent_type,
        domain_detected: discovery.domain,
        status: 'active',
        last_ping: new Date().toISOString()
    }, { onConflict: 'agent_id' })

    await supabaseAdmin.from('agents').update({
        mcp_url,
        mcp_tools: discovery.tools,
        mcp_capabilities: discovery.capabilities,
        auto_detected_type: discovery.agent_type,
        auto_detected_domain: discovery.domain
    }).eq('id', agent_id)
}

export const getMCPSession = async (agent_id: string) => {
    const { data } = await supabaseAdmin
        .from('mcp_sessions')
        .select('*')
        .eq('agent_id', agent_id)
        .maybeSingle()
    return data
}

export const getRecommendedBenchmarks = async (agent_type: string, domain: string) => {
    const { data: benchmarks } = await supabaseAdmin
        .from('benchmarks')
        .select('*')

    if (!benchmarks) return []

    const scored = benchmarks.map(b => {
        let score = 0
        const bName = b.name.toLowerCase()
        const bDomain = (b.domain || '').toLowerCase()

        if (agent_type === 'customer_support' && bDomain === 'customer_support') score += 3
        if (agent_type === 'coding' && bDomain === 'coding') score += 3
        if (agent_type === 'sales' && bName.includes('sales')) score += 3
        if (domain === bDomain) score += 2
        if (bName.includes('security')) score += 1

        return { ...b, relevance_score: score }
    })

    return scored.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 3)
}