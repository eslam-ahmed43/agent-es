export interface Profile {
    id: string
    full_name: string | null
    organization: string | null
    role: string
    created_at: string
}

export interface Project {
    id: string
    name: string
    description: string | null
    org_id: string
    created_by: string
    created_at: string
}

export interface Agent {
    id: string
    name: string
    description: string | null
    domain: string | null
    type: 'api' | 'openai_compatible' | 'prompt_only' | 'rag' | 'tool_calling'
    system_prompt: string | null
    endpoint_url: string | null
    api_key_encrypted: string | null
    model: string | null
    version: string
    project_id: string
    created_by: string
    created_at: string
}

export interface Message {
    role: 'user' | 'assistant'
    content: string
}

export interface Scenario {
    id: string
    name: string
    type: 'persona' | 'edge_case' | 'attack' | 'long_conversation'
    persona: string | null
    messages: Message[]
    expected_behavior: string | null
    agent_id: string
    created_at: string
}

export interface Run {
    id: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    agent_id: string
    project_id: string
    total_scenarios: number
    completed_scenarios: number
    overall_score: number | null
    started_at: string | null
    completed_at: string | null
    created_at: string
}

export interface Evaluation {
    id: string
    run_id: string
    scenario_id: string
    agent_response: string | null
    syntax_score: number | null
    safety_score: number | null
    relevance_score: number | null
    overall_score: number | null
    passed: boolean | null
    failure_reason: string | null
    raw_response: any
    created_at: string
}

export interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: string
    message?: string
}