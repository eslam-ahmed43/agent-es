import { AgentAdapter, AgentCapabilities, AgentExecutionRequest, AgentExecutionResponse, AgentHealthCheck } from '../contracts'
import { callExecution, AIMessage } from '../ai-router'

export class PromptAdapter implements AgentAdapter {
    type = 'prompt_only'

    constructor(
        private system_prompt: string,
        private model: string = 'meta-llama/llama-4-scout-17b-16e-instruct',
        private provider: string = 'groq',
        private temperature: number = 0.7
    ) { }

    async health(): Promise<AgentHealthCheck> {
        return {
            reachable: true, auth: true, latency: 0,
            capabilities: { streaming: false, tools: false, vision: false, json_mode: true, max_tokens: 8192 }
        }
    }

    async execute(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
        const start = Date.now()
        const systemContent = request.system_prompt || this.system_prompt || 'You are a helpful assistant.'

        const messages: AIMessage[] = [
            { role: 'system', content: systemContent },
            ...request.messages
                .filter((m: any) => m.role === 'user' || m.role === 'assistant')
                .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content || '') }))
        ]

        const res = await callExecution({
            messages,
            temperature: request.temperature ?? this.temperature ?? 0.7,
            max_tokens: request.max_tokens || 1500,
            provider: this.provider as any,
            model: this.model
        })

        return {
            content: res.content,
            latency: Date.now() - start,
            tokens_used: res.tokens_used,
            raw: res
        }
    }

    async capabilities(): Promise<AgentCapabilities> {
        return { streaming: false, tools: false, vision: false, json_mode: true, max_tokens: 8192 }
    }
}