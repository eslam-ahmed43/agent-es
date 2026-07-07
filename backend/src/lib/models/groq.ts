import { ModelInfo } from './types'

export const groqModels: ModelInfo[] = [
    {
        id: 'meta-llama/llama-4-scout-17b-16e-instruct',
        name: 'Llama 4 Scout',
        provider: 'groq',
        family: 'Llama',
        tier: 'free',
        capabilities: { vision: true, tools: true, reasoning: false, streaming: true, json: true }
    },
    {
        id: 'qwen/qwen3-32b',
        name: 'Qwen3 32B',
        provider: 'groq',
        family: 'Qwen',
        tier: 'free',
        capabilities: { vision: false, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'openai/gpt-oss-120b',
        name: 'GPT OSS 120B',
        provider: 'groq',
        family: 'GPT',
        tier: 'free',
        capabilities: { vision: false, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'qwen/qwen3.6-27b',
        name: 'Qwen3.6 27B',
        provider: 'groq',
        family: 'Qwen',
        tier: 'free',
        capabilities: { vision: false, tools: true, reasoning: true, streaming: true, json: true }
    }
]