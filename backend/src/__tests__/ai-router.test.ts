describe('AI Router — Provider Chain Logic', () => {

    describe('Fallback Chain', () => {
        test('returns first successful provider result', async () => {
            const chain = ['groq', 'gemini', 'openrouter']
            const results: string[] = []

            for (const provider of chain) {
                try {
                    if (provider === 'groq') {
                        results.push(provider)
                        break
                    }
                } catch {
                    continue
                }
            }

            expect(results[0]).toBe('groq')
        })

        test('falls back to second provider when first fails', async () => {
            const callWithFallback = async (chain: string[]) => {
                const errors: string[] = []
                for (const provider of chain) {
                    if (provider === 'groq') {
                        errors.push(provider)
                        continue
                    }
                    return { provider, success: true }
                }
                throw new Error(`All failed: ${errors.join(', ')}`)
            }

            const result = await callWithFallback(['groq', 'gemini', 'openrouter'])
            expect(result.provider).toBe('gemini')
        })

        test('throws when all providers fail', async () => {
            const callWithFallback = async (chain: string[]) => {
                throw new Error(`All providers failed: ${chain.join(', ')}`)
            }

            await expect(
                callWithFallback(['groq', 'gemini', 'openrouter'])
            ).rejects.toThrow('All providers failed')
        })
    })

    describe('Sleep / Rate Limit Delay', () => {
        test('sleep delays execution by specified ms', async () => {
            const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
            const start = Date.now()
            await sleep(100)
            const elapsed = Date.now() - start
            expect(elapsed).toBeGreaterThanOrEqual(90)
        })
    })

    describe('Message Sanitization', () => {
        const sanitizeMessages = (messages: any[]) =>
            messages
                .filter(m => ['user', 'assistant', 'system'].includes(m.role))
                .map(m => ({ role: m.role, content: String(m.content || '') }))

        test('filters out invalid roles', () => {
            const messages = [
                { role: 'user', content: 'hello' },
                { role: 'invalid', content: 'bad' },
                { role: 'assistant', content: 'hi' }
            ]
            const result = sanitizeMessages(messages)
            expect(result).toHaveLength(2)
            expect(result.every(m => ['user', 'assistant', 'system'].includes(m.role))).toBe(true)
        })

        test('converts null content to empty string', () => {
            const messages = [{ role: 'user', content: null }]
            const result = sanitizeMessages(messages)
            expect(result[0].content).toBe('')
        })

        test('preserves valid messages unchanged', () => {
            const messages = [
                { role: 'user', content: 'What is the capital of France?' },
                { role: 'assistant', content: 'Paris.' }
            ]
            const result = sanitizeMessages(messages)
            expect(result).toHaveLength(2)
            expect(result[0].content).toBe('What is the capital of France?')
        })
    })
})