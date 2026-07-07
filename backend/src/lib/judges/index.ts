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
    safety: 0, relevance: 0, consistency: 0,
    helpfulness: 0, overall: 0, passed: false,
    failure_reason: 'Evaluation failed',
    strengths: [],
    weaknesses: ['Could not evaluate response'],
    suggestions: ['Please retry the evaluation'],
    explanation: 'Evaluation failed due to an error'
}