describe('Execution Engine — Core Logic', () => {

    describe('Score Calculation', () => {
        const calculateOverallScore = (scores: number[]): number => {
            if (scores.length === 0) return 0
            return scores.reduce((a, b) => a + b, 0) / scores.length
        }

        test('calculates average correctly', () => {
            expect(calculateOverallScore([0.8, 0.9, 0.7])).toBeCloseTo(0.8)
        })

        test('returns 0 for empty scores', () => {
            expect(calculateOverallScore([])).toBe(0)
        })

        test('handles single score', () => {
            expect(calculateOverallScore([0.85])).toBe(0.85)
        })

        test('handles all zeros', () => {
            expect(calculateOverallScore([0, 0, 0])).toBe(0)
        })

        test('handles perfect scores', () => {
            expect(calculateOverallScore([1, 1, 1])).toBe(1)
        })
    })

    describe('Reliability Score Calculation', () => {
        const calculateReliability = (metrics: {
            overall: number
            safety: number
            consistency: number
            helpfulness: number
            stability: number
            pass_rate: number
        }): number => {
            return (
                metrics.overall * 0.30 +
                metrics.safety * 0.20 +
                metrics.consistency * 0.15 +
                metrics.helpfulness * 0.15 +
                metrics.stability * 0.10 +
                metrics.pass_rate * 0.10
            )
        }

        test('perfect scores give reliability of 1', () => {
            const result = calculateReliability({
                overall: 1, safety: 1, consistency: 1,
                helpfulness: 1, stability: 1, pass_rate: 1
            })
            expect(result).toBe(1)
        })

        test('weights sum to 1.0', () => {
            const weights = [0.30, 0.20, 0.15, 0.15, 0.10, 0.10]
            const sum = weights.reduce((a, b) => a + b, 0)
            expect(sum).toBeCloseTo(1.0)
        })

        test('safety weighted higher than helpfulness', () => {
            const highSafety = calculateReliability({
                overall: 0.5, safety: 1.0, consistency: 0.5,
                helpfulness: 0.0, stability: 0.5, pass_rate: 0.5
            })
            const highHelpfulness = calculateReliability({
                overall: 0.5, safety: 0.0, consistency: 0.5,
                helpfulness: 1.0, stability: 0.5, pass_rate: 0.5
            })
            expect(highSafety).toBeGreaterThan(highHelpfulness)
        })

        test('zero scores give reliability of 0', () => {
            const result = calculateReliability({
                overall: 0, safety: 0, consistency: 0,
                helpfulness: 0, stability: 0, pass_rate: 0
            })
            expect(result).toBe(0)
        })
    })

    describe('Stability Score Calculation', () => {
        const calculateStability = (scores: number[]): number => {
            if (scores.length === 0) return 0
            const mean = scores.reduce((a, b) => a + b, 0) / scores.length
            const variance = scores.reduce((sum, s) =>
                sum + Math.pow(s - mean, 2), 0) / scores.length
            return Math.max(0, 1 - Math.sqrt(variance))
        }

        test('consistent scores give high stability', () => {
            const stability = calculateStability([0.85, 0.85, 0.85, 0.85])
            expect(stability).toBe(1)
        })

        test('variable scores give lower stability', () => {
            const stable = calculateStability([0.85, 0.85, 0.85])
            const variable = calculateStability([0.5, 1.0, 0.5, 1.0])
            expect(stable).toBeGreaterThan(variable)
        })

        test('stability never goes below 0', () => {
            const stability = calculateStability([0, 1, 0, 1, 0, 1])
            expect(stability).toBeGreaterThanOrEqual(0)
        })
    })

    describe('Run Cancellation Logic', () => {
        test('stops processing when cancelled flag is true', async () => {
            const runState = { cancelled: false, processed: 0 }
            const scenarios = [1, 2, 3, 4, 5]

            for (const scenario of scenarios) {
                if (runState.cancelled) break
                runState.processed++
                if (scenario === 3) runState.cancelled = true
            }

            expect(runState.processed).toBe(3)
        })
    })
})