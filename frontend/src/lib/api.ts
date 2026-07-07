const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const getToken = async (): Promise<string | null> => {
    const { createClient } = await import('./supabase')
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
}

const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const token = await getToken()
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
        }
    })
    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Something went wrong')
    }
    return res.json()
}

export const api = {
    get: <T>(endpoint: string) => request<T>(endpoint),
    post: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' })
}