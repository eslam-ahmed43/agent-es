describe('Judge Score Validation', () => {
    const clamp = (val: number, min = 0, max = 1): number =>
        Math.max(min, Math.min(max, val))

    const safeScore = (judgeScore: any) => {
        if (!judgeScore) return null
        return {
            overall: clamp(judgeScore.overall || 0),
            safety: clamp(judgeScore.safety || 0),
            relevance: clamp(judgeScore.relevance || 0),
            consistency: clamp(judgeScore.consistency || 0),
            helpfulness: clamp(judgeScore.helpfulness || 0)
        }
    }

    describe('clamp()', () => {
        test('returns 0 for negative values', () => {
            expect(clamp(-0.5)).toBe(0)
        })

        test('returns 1 for values above 1', () => {
            expect(clamp(1.8)).toBe(1)
        })

        test('preserves valid scores', () => {
            expect(clamp(0.85)).toBe(0.85)
        })

        test('handles exactly 0', () => {
            expect(clamp(0)).toBe(0)
        })

        test('handles exactly 1', () => {
            expect(clamp(1)).toBe(1)
        })

        test('handles very large values', () => {
            expect(clamp(100)).toBe(1)
        })
    })

    describe('safeScore()', () => {
        test('returns null for null input', () => {
            expect(safeScore(null)).toBeNull()
        })

        test('clamps all dimensions to 0-1', () => {
            const result = safeScore({
                overall: 1.8,
                safety: -0.2,
                relevance: 0.9,
                consistency: 2.5,
                helpfulness: 0.7
            })
            expect(result?.overall).toBe(1)
            expect(result?.safety).toBe(0)
            expect(result?.relevance).toBe(0.9)
            expect(result?.consistency).toBe(1)
            expect(result?.helpfulness).toBe(0.7)
        })

        test('handles missing dimensions with 0 default', () => {
            const result = safeScore({ overall: 0.8 })
            expect(result?.safety).toBe(0)
            expect(result?.relevance).toBe(0)
        })

        test('preserves valid scores unchanged', () => {
            const input = {
                overall: 0.85,
                safety: 0.90,
                relevance: 0.78,
                consistency: 0.82,
                helpfulness: 0.88
            }
            const result = safeScore(input)
            expect(result?.overall).toBe(0.85)
            expect(result?.safety).toBe(0.90)
        })
    })

    describe('Judge JSON Parsing', () => {
        const parseJudgeResponse = (content: string) => {
            const clean = content
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim()
            const match = clean.match(/\{[\s\S]*\}/)
            if (!match) return null
            try {
                return JSON.parse(match[0])
            } catch {
                return null
            }
        }

        test('parses clean JSON response', () => {
            const response = '{"overall": 0.85, "safety": 0.9}'
            const result = parseJudgeResponse(response)
            expect(result?.overall).toBe(0.85)
        })

        test('parses JSON wrapped in markdown code blocks', () => {
            const response = '```json\n{"overall": 0.85}\n```'
            const result = parseJudgeResponse(response)
            expect(result?.overall).toBe(0.85)
        })

        test('returns null for invalid JSON', () => {
            const response = 'This is not JSON at all'
            expect(parseJudgeResponse(response)).toBeNull()
        })

        test('extracts JSON from mixed content', () => {
            const response = 'Here is my evaluation: {"overall": 0.75, "passed": true} end'
            const result = parseJudgeResponse(response)
            expect(result?.overall).toBe(0.75)
        })
    })
})