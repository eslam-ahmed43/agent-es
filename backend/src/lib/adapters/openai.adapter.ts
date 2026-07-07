import { AgentAdapter, AgentCapabilities, AgentExecutionRequest, AgentExecutionResponse, AgentHealthCheck, ToolCall } from '../contracts'

export class OpenAIAdapter implements AgentAdapter {
    type = 'openai_compatible'

    constructor(
        private endpoint_url: string,
        private api_key: string,
        private model: string,
        private timeout = 30000
    ) { }

    async health(): Promise<AgentHealthCheck> {
        const start = Date.now()
        try {
            const res = await fetch(`${this.endpoint_url}/models`, {
                headers: { Authorization: `Bearer ${this.api_key}` }
            })
            return {
                reachable: true,
                auth: res.status !== 401 && res.status !== 403,
                latency: Date.now() - start,
                capabilities: { streaming: true, tools: true, vision: false, json_mode: true, max_tokens: 8192 }
            }
        } catch (err) {
            return {
                reachable: false, auth: false, latency: Date.now() - start,
                capabilities: { streaming: false, tools: false, vision: false, json_mode: false, max_tokens: 0 },
                error: err instanceof Error ? err.message : 'Unknown error'
            }
        }
    }

    async execute(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
        const start = Date.now()
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), this.timeout)

        try {
            const messages = []
            if (request.system_prompt) messages.push({ role: 'system', content: request.system_prompt })
            messages.push(...request.messages)

            const res = await fetch(`${this.endpoint_url}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.api_key}` },
                body: JSON.stringify({
                    model: this.model, messages,
                    temperature: request.temperature || 0.7,
                    max_tokens: request.max_tokens || 2000
                }),
                signal: controller.signal
            })
            clearTimeout(timer)

            if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)

            const data = await res.json() as {
                choices?: { message?: { content?: string | { type: string; text: string }[]; tool_calls?: any[] }; finish_reason?: string }[]
                usage?: { total_tokens?: number }
            }

            const message = data.choices?.[0]?.message
            let content = ''
            if (typeof message?.content === 'string') content = message.content
            else if (Array.isArray(message?.content)) {
                content = message.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('')
            }

            const tool_calls: ToolCall[] = message?.tool_calls?.map((tc: any) => ({
                id: tc.id, name: tc.function?.name,
                arguments: JSON.parse(tc.function?.arguments || '{}')
            })) || []

            return {
                content, latency: Date.now() - start,
                tokens_used: data.usage?.total_tokens,
                tool_calls: tool_calls.length > 0 ? tool_calls : undefined,
                finish_reason: data.choices?.[0]?.finish_reason,
                raw: data
            }
        } catch (err) {
            clearTimeout(timer)
            throw err
        }
    }

    async capabilities(): Promise<AgentCapabilities> {
        return { streaming: true, tools: true, vision: false, json_mode: true, max_tokens: 8192 }
    }
}