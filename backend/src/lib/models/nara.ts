import { ModelInfo } from './types'

export const naraModels: ModelInfo[] = [
    {
        id: 'claude-sonnet-4.5',
        name: 'Claude Sonnet 4.5',
        provider: 'openrouter' as any,
        family: 'Claude',
        tier: 'free',
        capabilities: { vision: true, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'claude-haiku-4.5',
        name: 'Claude Haiku 4.5',
        provider: 'openrouter' as any,
        family: 'Claude',
        tier: 'free',
        capabilities: { vision: true, tools: true, reasoning: false, streaming: true, json: true }
    },
    {
        id: 'glm-5',
        name: 'GLM 5',
        provider: 'openrouter' as any,
        family: 'GLM',
        tier: 'free',
        capabilities: { vision: true, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'deepseek-3.2',
        name: 'DeepSeek 3.2',
        provider: 'openrouter' as any,
        family: 'DeepSeek',
        tier: 'free',
        capabilities: { vision: false, tools: true, reasoning: true, streaming: true, json: true }
    }
]