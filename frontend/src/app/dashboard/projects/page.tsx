'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Plus, FolderOpen, Trash2, ArrowRight } from 'lucide-react'

interface Project {
    id: string
    name: string
    description: string | null
    created_at: string
}

export default function ProjectsPage() {
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [creating, setCreating] = useState(false)

    const fetchProjects = async () => {
        try {
            const res = await api.get<{ success: boolean; data: Project[] }>('/api/projects')
            setProjects(res.data || [])
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    useEffect(() => { fetchProjects() }, [])

    const handleCreate = async () => {
        if (!name.trim()) return
        setCreating(true)
        try {
            await api.post('/api/projects', { name, description })
            setName(''); setDescription(''); setShowModal(false); fetchProjects()
        } catch (err) { console.error(err) } finally { setCreating(false) }
    }

    const handleDelete = async (id: string) => {
        try { await api.delete(`/api/projects/${id}`); fetchProjects() } catch (err) { console.error(err) }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Projects</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your AI agent projects</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                    <Plus size={16} /> New Project
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <FolderOpen size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No projects yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Create your first project to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map(project => (
                        <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-400 transition group">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold truncate">{project.name}</h3>
                                    {project.description && <p className="text-gray-500 text-sm mt-1 line-clamp-2">{project.description}</p>}
                                </div>
                                <button onClick={() => handleDelete(project.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                    <Trash2 size={15} />
                                </button>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-xs text-gray-400">{new Date(project.created_at).toLocaleDateString()}</span>
                                <button onClick={() => router.push(`/dashboard/agents?project_id=${project.id}`)}
                                    className="flex items-center gap-1 text-xs text-black hover:underline">
                                    View Agents <ArrowRight size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md space-y-4">
                        <h2 className="text-lg font-semibold">Create New Project</h2>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="My AI Project"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleCreate} disabled={creating || !name.trim()}
                                className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}