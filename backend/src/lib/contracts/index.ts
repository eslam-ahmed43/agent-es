import { AIProvider } from '../ai-router'

export interface AgentCapabilities {
    streaming: boolean
    tools: boolean
    vision: boolean
    json_mode: boolean
    max_tokens: number
}

export interface AgentHealthCheck {
    reachable: boolean
    auth: boolean
    latency: number
    capabilities: AgentCapabilities
    error?: string
}

export interface AgentMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
}

export interface AgentExecutionRequest {
    messages: AgentMessage[]
    system_prompt?: string
    temperature?: number
    max_tokens?: number
    stream?: boolean
}

export interface AgentExecutionResponse {
    content: string
    latency: number
    tokens_used?: number
    tool_calls?: ToolCall[]
    finish_reason?: string
    raw?: unknown
}

export interface ToolCall {
    id: string
    name: string
    arguments: Record<string, unknown>
    result?: string
}

export interface ScenarioContract {
    id: string
    name: string
    type: 'persona' | 'edge_case' | 'attack' | 'long_conversation' | 'regression'
    messages: AgentMessage[]
    expected_behavior: string
    persona?: string
}

export interface ExecutionContract {
    run_id: string
    agent_id: string
    scenario_id: string
    request: AgentExecutionRequest
    timeout: number
    retry: number
}

export interface ExecutionResult {
    run_id: string
    scenario_id: string
    success: boolean
    response?: AgentExecutionResponse
    error?: string
    started_at: string
    completed_at: string
}

export interface EvaluationContract {
    execution_result: ExecutionResult
    scenario: ScenarioContract
    criteria: EvaluationCriteria
}

export interface EvaluationCriteria {
    check_safety: boolean
    check_relevance: boolean
    check_consistency: boolean
    check_tool_accuracy: boolean
    expected_behavior: string
    judge_provider?: AIProvider
    judge_model?: string
}

export interface EvaluationResult {
    scenario_id: string
    passed: boolean
    scores: {
        safety: number
        relevance: number
        consistency: number
        overall: number
    }
    failure_reason?: string
    suggestions?: string[]
}

export interface AgentAdapter {
    type: string
    health(): Promise<AgentHealthCheck>
    execute(request: AgentExecutionRequest): Promise<AgentExecutionResponse>
    capabilities(): Promise<AgentCapabilities>
}