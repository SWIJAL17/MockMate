'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Sparkles, PhoneOff, Video, Timer, Maximize2 } from 'lucide-react'

export default function LiveSessionPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: authSession, status } = useSession()
  const [session, setSession] = useState(null)
  const [ending, setEnding] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const iframeRef = useRef(null)
  const endedRef = useRef(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!authSession?.user) {
      router.push('/login')
      return
    }
    fetch(`/api/live/${id}`)
      .then(r => r.json())
      .then(j => {
        if (!j.session) { toast.error('Session not found'); router.push('/dashboard'); return }
        setSession(j.session)
      })
      .catch(() => { toast.error('Failed to load'); router.push('/dashboard') })
  }, [id, router, authSession, status])

  // Timer
  useEffect(() => {
    if (!session || session.status !== 'active') return
    const started = new Date(session.createdAt).getTime()
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(t)
  }, [session])

  const endInterview = async (opts = {}) => {
    const { silent = false, navigate = true } = opts
    if (endedRef.current) return
    endedRef.current = true
    setEnding(true)
    try {
      await fetch(`/api/live/${id}/end`, { method: 'POST' })
      if (!silent) toast.success('Generating your report…')
    } catch { /* noop */ }
    if (navigate) router.push(`/live/${id}/report`)
  }

  // Ensure conversation is ended if user closes tab / navigates away.
  useEffect(() => {
    const handler = () => {
      if (endedRef.current || !session) return
      try {
        const blob = new Blob([JSON.stringify({})], { type: 'application/json' })
        navigator.sendBeacon?.(`/api/live/${id}/end`, blob)
      } catch {}
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [id, session])

  const goFullscreen = () => {
    const el = iframeRef.current
    if (!el) return
    if (el.requestFullscreen) el.requestFullscreen()
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  if (!session) return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white bg-grid-pattern">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
        <p className="text-sm text-neutral-400">Connecting to your AI interviewer…</p>
      </div>
    </main>
  )

  const isEnded = session.status === 'ended' || endedRef.current

  return (
    <main className="min-h-screen bg-black text-white bg-grid-pattern flex flex-col">
      <nav className="border-b border-white/5 backdrop-blur-md bg-black/40 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            LIVE · <span className="text-white font-semibold">{session.role}</span> · {session.level}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-mono">
            <Timer className="h-3 w-3" /> {mm}:{ss}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goFullscreen} className="border-white/10 bg-white/5 hover:bg-white/10 hidden sm:inline-flex">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => endInterview()} disabled={ending || isEnded}
            className="bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25">
            {ending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Ending…</> : <><PhoneOff className="h-4 w-4 mr-1" /> End interview</>}
          </Button>
        </div>
      </nav>

      <section className="flex-1 flex items-center justify-center p-4 md:p-6">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-6xl h-[75vh] md:h-[80vh] rounded-3xl border border-white/10 bg-black overflow-hidden shadow-2xl shadow-rose-500/10 relative">
          {isEnded ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold">Interview ended</h2>
              <p className="text-neutral-400 max-w-md">Great work! Head to the dashboard to start another round or try text-based mock interviews with detailed feedback.</p>
              <div className="flex gap-2 mt-4">
                <Button asChild variant="outline" className="border-white/10 bg-white/5"><Link href="/dashboard">Dashboard</Link></Button>
                <Button asChild className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-500"><Link href="/live/new"><Video className="h-4 w-4 mr-1" /> New live interview</Link></Button>
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={session.conversationUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="w-full h-full block"
              style={{ border: 0 }}
            />
          )}
        </motion.div>
      </section>

      <div className="px-6 pb-5 text-center text-xs text-neutral-500">
        Tip: Speak naturally as you would in a real interview. The AI listens, responds, and adapts to you.
      </div>
    </main>
  )
}
