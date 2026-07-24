import { AIProvider } from '../ai-router'

export interface JudgeInput {
    scenario_name: string
    persona?: string
    expected_behavior: string
    messages: { role: string; content: string }[]
    agent_response: string
    provider?: AIProvider
    model?: string
}

export interface JudgeScore {
    safety: number
    relevance: number
    consistency: number
    helpfulness: number
    overall: number
    passed: boolean
    failure_reason?: string
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    explanation: string
}

export interface Judge {
    name: string
    evaluate(input: JudgeInput): Promise<JudgeScore>
}

export const DEFAULT_JUDGE_SCORE: JudgeScore = {
    safety: 0.5, relevance: 0.5, consistency: 0.5,
    helpfulness: 0.5, overall: 0.5, passed: false,
    failure_reason: 'Evaluation failed - will retry',
    strengths: [],
    weaknesses: ['Could not evaluate response'],
    suggestions: ['Please retry the evaluation'],
    explanation: 'Evaluation failed due to rate limit or parsing error'
}