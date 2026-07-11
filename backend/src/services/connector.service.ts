import { supabaseAdmin } from '../lib/supabase'

export type ConnectorType = 'mcp' | 'rest' | 'openapi' | 'n8n' | 'openai_sdk' | 'langraph' | 'crewai'

export const createConnector = async (
    agent_id: string,
    connector_type: ConnectorType,
    config: Record<string, any>
) => {
    const { data, error } = await supabaseAdmin.from('agent_connectors').insert({
        agent_id, connector_type, config, status: 'active'
    }).select().single()
    if (error) throw new Error(error.message)
    return data
}

export const testConnector = async (connector_id: string) => {
    const { data: connector } = await supabaseAdmin
        .from('agent_connectors').select('*').eq('id', connector_id).single()
    if (!connector) throw new Error('Connector not found')

    let reachable = false
    let latency = 0

    try {
        const start = Date.now()
        const url = connector.config?.url || connector.config?.endpoint || connector.config?.mcp_url
        if (url) {
            const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) })
            reachable = res.status < 500
            latency = Date.now() - start
        }
    } catch { reachable = false }

    await supabaseAdmin.from('agent_connectors').update({
        status: reachable ? 'active' : 'error',
        last_tested: new Date().toISOString()
    }).eq('id', connector_id)

    return { reachable, latency }
}

export const getConnectors = async (agent_id: string) => {
    const { data } = await supabaseAdmin
        .from('agent_connectors').select('*')
        .eq('agent_id', agent_id).order('created_at', { ascending: false })
    return data || []
}

export const deleteConnector = async (connector_id: string) => {
    await supabaseAdmin.from('agent_connectors').delete().eq('id', connector_id)
}