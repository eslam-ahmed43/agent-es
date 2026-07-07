import { AgentAdapter, AgentCapabilities, AgentExecutionRequest, AgentExecutionResponse, AgentHealthCheck } from '../contracts'

export class RestAdapter implements AgentAdapter {
    type = 'rest'

    constructor(
        private endpoint_url: string,
        private api_key?: string,
        private timeout = 30000
    ) { }

    async health(): Promise<AgentHealthCheck> {
        const start = Date.now()
        try {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 5000)

            const res = await fetch(this.endpoint_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.api_key ? { Authorization: `Bearer ${this.api_key}` } : {})
                },
                body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] }),
                signal: controller.signal
            })
            clearTimeout(timer)

            return {
                reachable: true,
                auth: res.status !== 401 && res.status !== 403,
                latency: Date.now() - start,
                capabilities: { streaming: false, tools: false, vision: false, json_mode: false, max_tokens: 4096 }
            }
        } catch (err) {
            return {
                reachable: false,
                auth: false,
                latency: Date.now() - start,
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
            const res = await fetch(this.endpoint_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.api_key ? { Authorization: `Bearer ${this.api_key}` } : {})
                },
                body: JSON.stringify({ messages: request.messages, system_prompt: request.system_prompt }),
                signal: controller.signal
            })
            clearTimeout(timer)

            if (!res.ok) throw new Error(`Agent returned ${res.status}: ${res.statusText}`)

            const data = await res.json() as { content?: string; message?: string; response?: string; text?: string }
            const content = data.content || data.message || data.response || data.text || JSON.stringify(data)

            return { content, latency: Date.now() - start, raw: data }
        } catch (err) {
            clearTimeout(timer)
            throw err
        }
    }

    async capabilities(): Promise<AgentCapabilities> {
        return { streaming: false, tools: false, vision: false, json_mode: false, max_tokens: 4096 }
    }
}