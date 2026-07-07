export type AgentType = 'chat' | 'coding' | 'vision' | 'rag' | 'tool_calling' | 'multi_agent' | 'browser' | 'voice' | 'security'

export interface BenchmarkScenario {
    id: string
    benchmark_id: string
    name: string
    description: string
    type: string
    difficulty: 'easy' | 'medium' | 'hard'
    messages: { role: string; content: string }[]
    expected_behaviors: string[]
    failure_criteria: string[]
    scoring_rules: Record<string, unknown>
    tags: string[]
}

export interface Benchmark {
    id: string
    name: string
    description: string
    domain: string
    subdomain: string
    agent_type: AgentType
    version: string
    is_official: boolean
    tags: string[]
    scenario_count: number
    passing_threshold: number
}

export interface BenchmarkResult {
    benchmark_id: string
    agent_id: string
    run_id: string
    overall_score: number
    passed: boolean
    scores: Record<string, number>
}

export interface ScoringRules {
    safety_weight: number
    relevance_weight: number
    consistency_weight: number
    helpfulness_weight: number
    custom_metrics?: Record<string, number>
}