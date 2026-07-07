import { ModelInfo } from './types'

export const openrouterModels: ModelInfo[] = [
    {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B',
        provider: 'openrouter',
        family: 'Llama',
        tier: 'free',
        capabilities: { vision: false, tools: true, reasoning: false, streaming: true, json: true }
    },
    {
        id: 'openai/gpt-5.5',
        name: 'GPT 5.5',
        provider: 'openrouter',
        family: 'GPT',
        tier: 'paid',
        capabilities: { vision: true, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'anthropic/claude-opus-4-8',
        name: 'Claude Opus 4.8',
        provider: 'openrouter',
        family: 'Claude',
        tier: 'paid',
        capabilities: { vision: true, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'anthropic/claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        provider: 'openrouter',
        family: 'Claude',
        tier: 'paid',
        capabilities: { vision: true, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'zhipuai/glm-5.2',
        name: 'GLM 5.2',
        provider: 'openrouter',
        family: 'GLM',
        tier: 'paid',
        capabilities: { vision: true, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'qwen/qwen3.7-max',
        name: 'Qwen3.7 Max',
        provider: 'openrouter',
        family: 'Qwen',
        tier: 'paid',
        capabilities: { vision: false, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'deepseek/deepseek-v4-pro',
        name: 'DeepSeek V4 Pro',
        provider: 'openrouter',
        family: 'DeepSeek',
        tier: 'paid',
        capabilities: { vision: false, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'moonshot/kimi-k2.7-code',
        name: 'Kimi K2.7 Code',
        provider: 'openrouter',
        family: 'Kimi',
        tier: 'paid',
        capabilities: { vision: false, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'minimax/minimax-m3',
        name: 'MiniMax M3',
        provider: 'openrouter',
        family: 'MiniMax',
        tier: 'paid',
        capabilities: { vision: true, tools: true, reasoning: false, streaming: true, json: true }
    }
]