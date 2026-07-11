import { supabaseAdmin } from '../lib/supabase'
import { callGeneration } from '../lib/ai-router'

interface MCPTool {
    name: string
    description: string
    inputSchema?: Record<string, any>
}

const CAPABILITY_KEYWORDS = {
    memory: ['memory', 'remember', 'recall', 'history', 'context', 'store'],
    planning: ['plan', 'think', 'reason', 'step', 'decompose', 'strategy'],
    tool_calling: ['tool', 'function', 'call', 'execute', 'invoke', 'api'],
    streaming: ['stream', 'chunk', 'partial', 'realtime'],
    rag: ['search', 'retriev', 'embed', 'vector', 'document', 'knowledge'],
    browser: ['browse', 'navigate', 'click', 'web', 'scrape', 'url'],
    multi_agent: ['agent', 'supervisor', 'worker', 'crew', 'orchestrat']
}

const detectCapabilities = (tools: MCPTool[]) => {
    const allText = tools.map(t => `${t.name} ${t.description}`).join(' ').toLowerCase()
    const result: Record<string, boolean> = {}
    for (const [cap, keywords] of Object.entries(CAPABILITY_KEYWORDS)) {
        result[cap] = keywords.some(kw => allText.includes(kw))
    }
    return result
}

const detectFramework = (tools: MCPTool[]): string => {
    const names = tools.map(t => t.name.toLowerCase()).join(' ')
    if (names.includes('langchain') || names.includes('langraph')) return 'LangGraph'
    if (names.includes('crew') || names.includes('crewai')) return 'CrewAI'
    if (names.includes('autogen')) return 'AutoGen'
    if (names.includes('n8n') || names.includes('workflow')) return 'n8n'
    if (names.includes('openai')) return 'OpenAI Agents SDK'
    if (names.includes('mastra')) return 'Mastra'
    if (names.includes('llama')) return 'LlamaIndex'
    return 'Custom MCP'
}

const getMissingCapabilities = (capabilities: Record<string, boolean>): string[] => {
    const missing: string[] = []
    if (!capabilities.memory) missing.push('No Memory — Agent forgets context between sessions')
    if (!capabilities.tool_calling) missing.push('No Tool Calling — Agent cannot use external tools')
    if (!capabilities.rag) missing.push('No RAG — Agent cannot search knowledge bases')
    missing.push('No Retry Strategy — Failed calls are not retried')
    missing.push('No Rate Limiter — API calls not throttled')
    if (!capabilities.planning) missing.push('No Planning — Agent cannot decompose complex tasks')
    return missing
}

const getProductionChecklist = (capabilities: Record<string, boolean>, toolCount: number) => {
    const checklist = {
        memory: capabilities.memory,
        tool_calling: capabilities.tool_calling,
        error_handling: toolCount > 0,
        retry_strategy: false,
        timeout_handling: false,
        logging: false,
        evaluation: true,
        regression_tests: true,
        cost_monitoring: true,
        prompt_injection_protection: capabilities.tool_calling,
        rate_limiting: false,
        analytics: true
    }
    const passed = Object.values(checklist).filter(Boolean).length
    const total = Object.keys(checklist).length
    const score = Math.round((passed / total) * 100)
    return { checklist, score }
}

const getCertificationLevel = (score: number, reliability: number): string => {
    const combined = (score + reliability) / 2
    if (combined >= 95) return 'platinum'
    if (combined >= 85) return 'gold'
    if (combined >= 70) return 'silver'
    if (combined >= 50) return 'bronze'
    return 'none'
}

export const generateFingerprint = async (
    agent_id: string,
    tools: MCPTool[],
    mcp_url: string,
    reliability_score = 0
) => {
    const capabilities = detectCapabilities(tools)
    const framework = detectFramework(tools)
    const missing = getMissingCapabilities(capabilities)
    const { checklist, score } = getProductionChecklist(capabilities, tools.length)
    const certification = getCertificationLevel(score, reliability_score)

    const prompt = `Analyze this AI Agent based on its MCP tools and classify it precisely.

TOOLS (${tools.length}):
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Respond ONLY with valid JSON:
{
  "detected_model": "GPT-4o|Claude|Gemini|Llama|Unknown",
  "agent_type": "customer_support|sales|coding|rag|data_analysis|automation|general",
  "domain": "e-commerce|healthcare|finance|education|technology|general",
  "confidence": 0.95,
  "reasoning": "brief"
}`

    let aiResult = { detected_model: 'Unknown', agent_type: 'general', domain: 'general', confidence: 0.7 }
    try {
        const res = await callGeneration({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 300
        })
        const clean = res.content.replace(/```json/g, '').replace(/```/g, '').trim()
        const match = clean.match(/\{[\s\S]*\}/)
        if (match) aiResult = { ...aiResult, ...JSON.parse(match[0]) }
    } catch { }

    const fingerprint = {
        agent_id,
        framework,
        transport: 'MCP',
        tools_count: tools.length,
        has_memory: capabilities.memory,
        has_planning: capabilities.planning,
        has_tool_calling: capabilities.tool_calling,
        has_streaming: capabilities.streaming,
        has_rag: capabilities.rag,
        has_browser: capabilities.browser,
        has_multi_agent: capabilities.multi_agent,
        detected_model: aiResult.detected_model,
        missing_capabilities: missing,
        production_checklist: checklist,
        checklist_score: score,
        certification_level: certification,
        confidence: aiResult.confidence,
        raw_discovery: { mcp_url, tools, agent_type: aiResult.agent_type, domain: aiResult.domain }
    }

    await supabaseAdmin.from('agent_fingerprints')
        .upsert(fingerprint, { onConflict: 'agent_id' })

    return { ...fingerprint, agent_type: aiResult.agent_type, domain: aiResult.domain }
}

export const getFingerprint = async (agent_id: string) => {
    const { data } = await supabaseAdmin
        .from('agent_fingerprints')
        .select('*')
        .eq('agent_id', agent_id)
        .maybeSingle()
    return data
}