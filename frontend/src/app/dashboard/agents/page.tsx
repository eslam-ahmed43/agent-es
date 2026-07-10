export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { Suspense } from 'react'
import dynamic_import from 'next/dynamic'

const AgentsContent = dynamic_import(() => import('./AgentsContent'), {
    ssr: false,
    loading: () => (
        <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
    )
})

export default function AgentsPage() {
    return (
        <Suspense fallback={
            <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
        }>
            <AgentsContent />
        </Suspense>
    )
}