import { AIProvider } from '../ai-router'

export type ModelTier = 'free' | 'paid' | 'enterprise'
export type ModelFamily = 'Gemini' | 'GPT' | 'Claude' | 'Llama' | 'GLM' | 'Qwen' | 'DeepSeek' | 'Mistral' | 'Kimi' | 'MiniMax' | 'Nemotron' | 'Other'

export interface ModelCapabilities {
    vision: boolean
    tools: boolean
    reasoning: boolean
    streaming: boolean
    json: boolean
}

export interface ModelInfo {
    id: string
    name: string
    provider: AIProvider
    family: ModelFamily
    tier: ModelTier
    context_window?: number
    max_tokens?: number
    capabilities: ModelCapabilities
}