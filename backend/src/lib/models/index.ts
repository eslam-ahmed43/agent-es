import { geminiModels } from './gemini'
import { groqModels } from './groq'
import { openrouterModels } from './openrouter'
import { ModelInfo } from './types'

const nvidiaModels: ModelInfo[] = [
    {
        id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
        name: 'Nemotron 3 Nano Omni Reasoning',
        provider: 'nvidia' as any,
        family: 'Nemotron',
        tier: 'free',
        context_window: 256000,
        max_tokens: 65536,
        capabilities: { vision: false, tools: false, reasoning: true, streaming: false, json: true }
    },
    {
        id: 'meta/llama-4-maverick-17b-128e-instruct',
        name: 'Llama 4 Maverick 17B',
        provider: 'nvidia' as any,
        family: 'Llama',
        tier: 'free',
        context_window: 128000,
        max_tokens: 4096,
        capabilities: { vision: true, tools: false, reasoning: false, streaming: false, json: true }
    },
    {
        id: 'meta/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B Instruct',
        provider: 'nvidia' as any,
        family: 'Llama',
        tier: 'free',
        context_window: 128000,
        max_tokens: 4096,
        capabilities: { vision: false, tools: false, reasoning: false, streaming: false, json: true }
    },
    {
        id: 'qwen/qwen2.5-coder-32b-instruct',
        name: 'Qwen 2.5 Coder 32B',
        provider: 'nvidia' as any,
        family: 'Qwen',
        tier: 'free',
        context_window: 32768,
        max_tokens: 4096,
        capabilities: { vision: false, tools: false, reasoning: false, streaming: false, json: true }
    }
]

export const AVAILABLE_MODELS: Record<string, ModelInfo[]> = {
    gemini: geminiModels,
    groq: groqModels,
    openrouter: openrouterModels,
    nvidia: nvidiaModels
}

export const MODEL_MAP = new Map<string, ModelInfo>()
Object.values(AVAILABLE_MODELS).flat().forEach(model => {
    MODEL_MAP.set(model.id, model)
})

export const getModelInfo = (id: string): ModelInfo | undefined => MODEL_MAP.get(id)
export const getModelsByFamily = (family: string): ModelInfo[] =>
    Object.values(AVAILABLE_MODELS).flat().filter(m => m.family === family)
export const getModelsByTier = (tier: string): ModelInfo[] =>
    Object.values(AVAILABLE_MODELS).flat().filter(m => m.tier === tier)
export const getFreeModels = (): ModelInfo[] => getModelsByTier('free')
export * from './types'