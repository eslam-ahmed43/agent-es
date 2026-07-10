'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const AgentsContent = dynamic(() => import('./AgentsContent'), { ssr: false })

export default function AgentsPage() {
    return (
        <Suspense fallback={<div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}</div>}>
            <AgentsContent />
        </Suspense>
    )
}