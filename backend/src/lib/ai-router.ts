import * as https from 'https'
import * as dotenv from 'dotenv'
dotenv.config()

export type AIProvider = 'gemini' | 'groq' | 'openrouter' | 'nvidia'

export interface AIMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
}

export interface AIResponse {
    content: string
    model: string
    provider: AIProvider
    tokens_used?: number
    latency?: number
    raw?: unknown
}

export interface AIRequestOptions {
    provider?: AIProvider
    model?: string
    messages: AIMessage[]
    temperature?: number
    max_tokens?: number
}

export class AIProviderError extends Error {
    constructor(
        public provider: AIProvider,
        public status: number,
        public model: string,
        message: string
    ) {
        super(message)
        this.name = 'AIProviderError'
    }
}

const THINKING_MODELS = ['gemini-3.5-flash', 'gemini-3-flash']

const PROVIDER_CONFIG = {
    gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        getKey: () => process.env.GEMINI_API_KEY,
        defaultModel: 'gemini-3.5-flash'
    },
    groq: {
        baseUrl: 'https://api.groq.com/openai/v1',
        getKey: () => process.env.GROQ_API_KEY,
        defaultModel: 'meta-llama/llama-4-scout-17b-16e-instruct'
    },
    openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1',
        getKey: () => process.env.OPENROUTER_API_KEY,
        defaultModel: 'anthropic/claude-sonnet-4.6',
        extraHeaders: {
            'HTTP-Referer': 'https://agentes.vercel.app',
            'X-Title': 'AgentOS'
        }
    },
    nvidia: {
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        getKey: () => process.env.NVIDIA_API_KEY,
        defaultModel: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'
    }
}

// Judge: Groq أول (سريع ومجاني) → Gemini → OpenRouter كـ backup
const JUDGE_CHAIN: AIProvider[] = ['groq', 'gemini', 'openrouter']
const JUDGE_MODELS: Partial<Record<AIProvider, string>> = {
    groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
    gemini: 'gemini-3.5-flash',
    openrouter: 'anthropic/claude-sonnet-4.6'
}

// Execution: Groq أسرع → NVIDIA → Gemini
const EXECUTION_CHAIN: AIProvider[] = ['groq', 'nvidia', 'gemini']
const EXECUTION_MODELS: Partial<Record<AIProvider, string>> = {
    groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
    nvidia: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    gemini: 'gemini-3.5-flash'
}

// Generation: Gemini أحسن للتوليد → NVIDIA → Groq
const GENERATION_CHAIN: AIProvider[] = ['gemini', 'nvidia', 'groq']
const GENERATION_MODELS: Partial<Record<AIProvider, string>> = {
    gemini: 'gemini-3.5-flash',
    nvidia: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    groq: 'meta-llama/llama-4-scout-17b-16e-instruct'
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs = 60000): Promise<Response> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    return fetch(url, { ...options, agent: httpsAgent, signal: controller.signal } as any)
        .finally(() => clearTimeout(timeout))
}

const fetchWithRetry = async (url: string, options: RequestInit, retries = 1): Promise<Response> => {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetchWithTimeout(url, options)
            if (res.status === 429 && i < retries) {
                await new Promise(r => setTimeout(r, 2000))
                continue
            }
            return res
        } catch (err: any) {
            if (err?.name === 'AbortError') throw err
            if (i === retries) throw err
            await new Promise(r => setTimeout(r, 1000))
        }
    }
    throw new Error('Max retries reached')
}

const extractContent = (data: unknown): string => {
    const d = data as Record<string, unknown>
    if (d?.candidates) {
        const candidates = d.candidates as { content?: { parts?: { text?: string }[] } }[]
        return candidates[0]?.content?.parts?.map(p => p.text || '').join('') || ''
    }
    const choices = (d?.choices as { message?: { content?: unknown } }[])
    if (!choices?.[0]?.message) return ''
    const content = choices[0].message.content
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
        return content.map((c: { type?: string; text?: string }) =>
            c.type === 'text' ? c.text || '' : ''
        ).join('')
    }
    return ''
}

const sanitizeMessages = (messages: AIMessage[]): AIMessage[] =>
    messages
        .filter(m => ['user', 'assistant', 'system'].includes(m.role))
        .map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: String(m.content || '') }))

const buildGeminiConfig = (model: string, temperature: number, maxTokens: number): Record<string, unknown> => {
    if (THINKING_MODELS.includes(model)) {
        return { maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } }
    }
    return { temperature, maxOutputTokens: maxTokens }
}

const callGemini = async (options: AIRequestOptions): Promise<AIResponse> => {
    const config = PROVIDER_CONFIG.gemini
    const apiKey = config.getKey()
    if (!apiKey) throw new AIProviderError('gemini', 0, '', 'Missing GEMINI_API_KEY')

    const model = options.model || config.defaultModel
    const start = Date.now()
    const messages = sanitizeMessages(options.messages)
    const systemMsg = messages.find(m => m.role === 'system')
    const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))

    const body: Record<string, unknown> = { contents }
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] }
    body.generationConfig = buildGeminiConfig(model, options.temperature ?? 0.7, options.max_tokens || 1500)

    const res = await fetchWithRetry(
        `${config.baseUrl}/${model}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )

    if (!res.ok) {
        const err = await res.json() as { error?: { message?: string } }
        throw new AIProviderError('gemini', res.status, model, `Gemini error: ${err.error?.message || res.statusText}`)
    }

    const data = await res.json() as { usageMetadata?: { totalTokenCount?: number } }
    const content = extractContent(data)
    if (!content) throw new AIProviderError('gemini', 200, model, 'Gemini returned empty content')

    return { content, model, provider: 'gemini', tokens_used: data.usageMetadata?.totalTokenCount, latency: Date.now() - start, raw: data }
}

const callNvidia = async (options: AIRequestOptions): Promise<AIResponse> => {
    const config = PROVIDER_CONFIG.nvidia
    const apiKey = config.getKey()
    if (!apiKey) throw new AIProviderError('nvidia', 0, '', 'Missing NVIDIA_API_KEY')

    const model = options.model || config.defaultModel
    const start = Date.now()
    const messages = sanitizeMessages(options.messages)

    const res = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.6,
            top_p: 0.95,
            max_tokens: options.max_tokens || 4096,
            stream: false
        })
    })

    if (!res.ok) {
        const text = await res.text()
        let message = res.statusText
        try { const err = JSON.parse(text) as { error?: { message?: string } }; message = err.error?.message || message } catch { }
        throw new AIProviderError('nvidia', res.status, model, `nvidia error: ${message}`)
    }

    const data = await res.json() as { usage?: { total_tokens?: number } }
    const content = extractContent(data)
    if (!content) throw new AIProviderError('nvidia', 200, model, 'nvidia returned empty content')

    return { content, model, provider: 'nvidia', tokens_used: data.usage?.total_tokens, latency: Date.now() - start, raw: data }
}

const callOpenAICompatible = async (
    options: AIRequestOptions,
    provider: Exclude<AIProvider, 'gemini' | 'nvidia'>
): Promise<AIResponse> => {
    const config = PROVIDER_CONFIG[provider]
    const apiKey = config.getKey()
    if (!apiKey) throw new AIProviderError(provider, 0, '', `Missing API key for ${provider}`)

    const model = options.model || config.defaultModel
    const start = Date.now()
    const messages = sanitizeMessages(options.messages)

    const res = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...('extraHeaders' in config ? (config as any).extraHeaders : {})
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.max_tokens || 1500
        })
    })

    if (!res.ok) {
        const text = await res.text()
        let message = res.statusText
        try { const err = JSON.parse(text) as { error?: { message?: string } }; message = err.error?.message || message } catch { }
        throw new AIProviderError(provider, res.status, model, `${provider} error: ${message}`)
    }

    const data = await res.json() as { usage?: { total_tokens?: number } }
    const content = extractContent(data)
    if (!content) throw new AIProviderError(provider, 200, model, `${provider} returned empty content`)

    return { content, model, provider, tokens_used: data.usage?.total_tokens, latency: Date.now() - start, raw: data }
}

export const callAI = async (options: AIRequestOptions): Promise<AIResponse> => {
    const provider = options.provider || 'groq'
    if (provider === 'gemini') return callGemini(options)
    if (provider === 'nvidia') return callNvidia(options)
    return callOpenAICompatible(options, provider as 'groq' | 'openrouter')
}

export const callWithFallback = async (
    options: AIRequestOptions,
    chain: AIProvider[],
    modelMap?: Partial<Record<AIProvider, string>>
): Promise<AIResponse> => {
    const errors: string[] = []
    for (const provider of chain) {
        try {
            const model = modelMap?.[provider] || PROVIDER_CONFIG[provider].defaultModel
            const res = await callAI({ ...options, provider, model })
            console.log(`Provider ${provider} succeeded`)
            return res
        } catch (err: any) {
            console.error(`Provider ${provider} failed:`, err?.message || 'Unknown error')
            errors.push(`${provider}: ${err?.message || 'Unknown'}`)
        }
    }
    throw new Error(`All providers failed:\n${errors.join('\n')}`)
}

export const callJudge = (options: AIRequestOptions): Promise<AIResponse> =>
    callWithFallback(options, JUDGE_CHAIN, JUDGE_MODELS)

export const callExecution = (options: AIRequestOptions): Promise<AIResponse> =>
    callWithFallback(options, EXECUTION_CHAIN, EXECUTION_MODELS)

export const callGeneration = (options: AIRequestOptions): Promise<AIResponse> =>
    callWithFallback(options, GENERATION_CHAIN, GENERATION_MODELS)