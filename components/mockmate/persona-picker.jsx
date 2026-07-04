'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PersonaPicker({ value, onChange }) {
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tavus/replicas').then(r => r.json())
      .then(j => {
        const list = j.replicas || []
        setPersonas(list)
        // Auto-select first if none chosen
        if (list.length && !value) onChange?.(list[0].replica_id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
     
  }, [])

  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-neutral-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading interviewers…</div>
  )

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {personas.map(p => {
        const selected = value === p.replica_id
        return (
          <motion.button key={p.replica_id} type="button" onClick={() => onChange?.(p.replica_id)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className={cn('relative rounded-xl overflow-hidden border-2 transition-all aspect-[3/4]',
              selected ? 'border-rose-500 shadow-lg shadow-rose-500/30' : 'border-white/10 hover:border-white/30')}>
            <video src={p.thumbnail_video_url} muted loop playsInline autoPlay preload="metadata"
              className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2">
              <p className="text-xs font-semibold truncate">{p.name}</p>
              <p className="text-[10px] text-neutral-400 truncate">{p.role || ''}</p>
            </div>
            {selected && (
              <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-rose-500 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
