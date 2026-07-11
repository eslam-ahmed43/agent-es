import { AgentAdapter, AgentCapabilities, AgentExecutionRequest, AgentExecutionResponse, AgentHealthCheck } from '../contracts'

export class MCPAdapter implements AgentAdapter {
    type = 'mcp'

    constructor(
        private mcp_url: string,
        private api_key?: string
    ) { }

    async health(): Promise<AgentHealthCheck> {
        try {
            const res = await fetch(`${this.mcp_url}/health`, {
                headers: this.api_key ? { 'Authorization': `Bearer ${this.api_key}` } : {}
            })
            return {
                reachable: res.ok,
                auth: res.ok,
                latency: 0,
                capabilities: { streaming: false, tools: true, vision: false, json_mode: true, max_tokens: 4096 }
            }
        } catch {
            return { reachable: false, auth: false, latency: 0, capabilities: { streaming: false, tools: false, vision: false, json_mode: false, max_tokens: 0 } }
        }
    }

    async execute(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
        const start = Date.now()
        const lastMessage = request.messages[request.messages.length - 1]

        const payload = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
                name: 'chat',
                arguments: {
                    message: lastMessage?.content || '',
                    system_prompt: request.system_prompt || '',
                    history: request.messages.slice(0, -1)
                }
            }
        }

        const res = await fetch(`${this.mcp_url}/mcp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.api_key ? { 'Authorization': `Bearer ${this.api_key}` } : {})
            },
            body: JSON.stringify(payload)
        })

        if (!res.ok) throw new Error(`MCP error: ${res.statusText}`)

        const data = await res.json() as any
        const content = data?.result?.content?.[0]?.text || data?.result?.text || JSON.stringify(data?.result) || ''

        return {
            content,
            latency: Date.now() - start,
            tokens_used: 0,
            raw: data
        }
    }

    async capabilities(): Promise<AgentCapabilities> {
        return { streaming: false, tools: true, vision: false, json_mode: true, max_tokens: 4096 }
    }
}