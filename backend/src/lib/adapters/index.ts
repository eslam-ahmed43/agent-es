import { AgentAdapter } from '../contracts'
import { RestAdapter } from './rest.adapter'
import { OpenAIAdapter } from './openai.adapter'
import { PromptAdapter } from './prompt.adapter'
import { AIProvider } from '../ai-router'

export interface AgentConfig {
    type: 'rest' | 'openai_compatible' | 'prompt_only' | 'rag' | 'tool_calling'
    endpoint_url?: string
    api_key?: string
    model?: string
    system_prompt?: string
    provider?: AIProvider
}

export const createAdapter = (config: AgentConfig): AgentAdapter => {
    switch (config.type) {
        case 'rest':
            if (!config.endpoint_url) throw new Error('endpoint_url required for REST adapter')
            return new RestAdapter(config.endpoint_url, config.api_key)

        case 'openai_compatible':
            if (!config.endpoint_url || !config.api_key) throw new Error('endpoint_url and api_key required for OpenAI adapter')
            return new OpenAIAdapter(config.endpoint_url, config.api_key, config.model || 'gpt-4o')

        case 'prompt_only':
        case 'rag':
        case 'tool_calling':
        default:
            return new PromptAdapter(
                config.system_prompt || 'You are a helpful assistant.',
                config.model || 'gemini-2.5-flash',
                config.provider || 'gemini'
            )
    }
}

export { RestAdapter, OpenAIAdapter, PromptAdapter }