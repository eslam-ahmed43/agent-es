import { ModelInfo } from './types'

export const geminiModels: ModelInfo[] = [
    {
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash',
        provider: 'gemini',
        family: 'Gemini',
        tier: 'free',
        capabilities: { vision: true, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'gemini',
        family: 'Gemini',
        tier: 'free',
        capabilities: { vision: true, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'gemini',
        family: 'Gemini',
        tier: 'free',
        capabilities: { vision: true, tools: true, reasoning: true, streaming: true, json: true }
    },
    {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        provider: 'gemini',
        family: 'Gemini',
        tier: 'free',
        capabilities: { vision: true, tools: true, reasoning: false, streaming: true, json: true }
    }
]