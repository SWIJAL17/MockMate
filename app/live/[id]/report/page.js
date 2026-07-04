'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Lightbulb, Sparkles, ArrowLeft, Loader2, Trophy, RotateCcw, Home, Video, Eye, MessageSquare, AlertTriangle } from 'lucide-react'
import { ExportPdfButton } from '@/components/mockmate/pdf-export'

export default function LiveReportPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: authSession, status: authStatus } = useSession()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dots, setDots] = useState(0)

  useEffect(() => {
    if (!session || session.reportStatus === 'PROCESSING') {
      const t = setInterval(() => setDots(d => (d + 1) % 4), 500)
      return () => clearInterval(t)
    }
  }, [session])

  useEffect(() => {
    if (authStatus === 'loading') return
    if (!authSession?.user) {
      router.push('/login')
      return
    }

    let stop = false
    let attempts = 0

    const poll = async () => {
      if (stop) return
      try {
        const r = await fetch(`/api/live/${id}`)
        const j = await r.json()
        if (!j.session) { router.push('/dashboard'); return }
        setSession(j.session)
        setLoading(false)

        if (j.session.reportStatus !== 'PROCESSING' && j.session.reportStatus) return
        attempts++
        if (attempts < 30) setTimeout(poll, 3000)
      } catch {
        attempts++
        if (attempts < 30) setTimeout(poll, 3000)
      }
    }

    poll()
    return () => { stop = true }
  }, [id, router, authSession, authStatus])

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
    </main>
  )
  if (!session) return null

  const reportStatus = session.reportStatus
  const isProcessing = reportStatus === 'PROCESSING' || !reportStatus
  const isFailed = reportStatus === 'FAILED'
  const isReady = reportStatus === 'READY'

  const score = session.overall ?? 0
  const grade = score >= 85 ? 'Outstanding' : score >= 70 ? 'Strong' : score >= 50 ? 'Decent' : score >= 30 ? 'Needs work' : 'Rough'
  const scoreColor = score >= 75 ? 'emerald' : score >= 50 ? 'amber' : 'rose'

  const funMessages = [
    'Fetching transcript from the conversation…',
    'Analyzing your answers…',
    'Grading against senior-engineer bar…',
    'Finding your strengths…',
    'Spotting areas to improve…',
    'Almost there…',
  ]
  const msg = funMessages[Math.min(Math.floor((Date.now() / 3000) % funMessages.length), funMessages.length - 1)]

  return (
    <main className="min-h-screen bg-black text-white py-8 px-6 bg-grid-pattern">
      <nav className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <Link href="/dashboard" className="text-sm text-neutral-400 hover:text-white flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Sparkles className="h-4 w-4 text-purple-400" /> MockMate
        </div>
      </nav>

      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {isProcessing && (
            <motion.div key="proc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="glass rounded-3xl border border-white/10 p-14 text-center relative overflow-hidden">
              <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-rose-500/20 blur-3xl" />
              <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
              <div className="relative">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/30">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold">Generating your report{'.'.repeat(dots)}</h1>
                <p className="text-neutral-400 mt-3 text-lg">{msg}</p>
                <p className="text-neutral-500 mt-6 text-sm max-w-md mx-auto">This takes ~15–30 seconds. Grabbing your live video transcript and running it through MockMate AI for grading and scoring.</p>
              </div>
            </motion.div>
          )}

          {isFailed && (
            <motion.div key="fail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass rounded-3xl border border-amber-500/30 p-12 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="h-7 w-7 text-amber-400" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">Couldn’t generate the report</h1>
              <p className="text-neutral-400 mt-3 max-w-md mx-auto">{session.reportError || 'Something went wrong. Please try another live interview.'}</p>
              <div className="mt-6 flex justify-center gap-3">
                <Button asChild variant="outline" className="border-white/10 bg-white/5"><Link href="/dashboard">Dashboard</Link></Button>
                <Button asChild className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-500"><Link href="/live/new"><Video className="h-4 w-4 mr-1" /> Try again</Link></Button>
              </div>
            </motion.div>
          )}

          {isReady && (
            <motion.div key="ready" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              id="report-root"
              className="glass rounded-3xl border border-white/10 p-10 relative overflow-hidden">
              <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-rose-500/20 blur-3xl" />
              <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs mb-4">
                  <Video className="h-3.5 w-3.5 text-rose-400" />
                  <span className="text-rose-200 font-medium">LIVE INTERVIEW REPORT</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{session.role}</h1>
                <p className="text-neutral-400 mt-2">{session.level} · {session.type?.replace('_', ' ')} · {new Date(session.createdAt).toLocaleDateString()}</p>

                <div className="mt-10 flex flex-col md:flex-row items-start md:items-center gap-8">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="relative">
                    <div className={`h-36 w-36 rounded-full flex items-center justify-center border-4 border-${scoreColor}-400/40 bg-${scoreColor}-500/10 shadow-2xl shadow-${scoreColor}-500/20`}>
                      <div className="text-center">
                        <div className={`text-5xl font-extrabold text-${scoreColor}-400`}>{score}</div>
                        <div className="text-xs text-neutral-400 mt-1">/ 100</div>
                      </div>
                    </div>
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-${scoreColor}-500 text-white text-xs font-bold px-3 py-1 shadow-lg`}>{grade}</div>
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 text-neutral-300">Summary</h3>
                    <p className="text-lg leading-relaxed text-neutral-100">{session.summary}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-12">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-6">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold mb-4 uppercase text-xs tracking-wider"><CheckCircle2 className="h-4 w-4" /> Strengths</div>
                    <ul className="space-y-3 text-sm text-neutral-200">{(session.strengths || []).map((s, i) => <li key={i} className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span> <span>{s}</span></li>)}</ul>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.05] p-6">
                    <div className="flex items-center gap-2 text-rose-400 font-bold mb-4 uppercase text-xs tracking-wider"><XCircle className="h-4 w-4" /> Weaknesses</div>
                    <ul className="space-y-3 text-sm text-neutral-200">{(session.weaknesses || []).map((s, i) => <li key={i} className="flex gap-2"><span className="text-rose-400 mt-0.5">✗</span> <span>{s}</span></li>)}</ul>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] p-6">
                    <div className="flex items-center gap-2 text-amber-400 font-bold mb-4 uppercase text-xs tracking-wider"><Lightbulb className="h-4 w-4" /> Improvement tips</div>
                    <ul className="space-y-3 text-sm text-neutral-200">{(session.tips || []).map((s, i) => <li key={i} className="flex gap-2"><span className="text-amber-400 mt-0.5">→</span> <span>{s}</span></li>)}</ul>
                  </motion.div>
                </div>

                {session.perception && (
                  <div className="mt-10 rounded-2xl border border-purple-400/20 bg-purple-500/[0.05] p-6">
                    <div className="flex items-center gap-2 text-purple-300 font-bold mb-3 uppercase text-xs tracking-wider"><Eye className="h-4 w-4" /> Visual observations from the interviewer</div>
                    <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">{session.perception}</p>
                  </div>
                )}

                {!!(session.questionsCovered && session.questionsCovered.length) && (
                  <div className="mt-10">
                    <h3 className="font-bold text-lg mb-4">Topics covered</h3>
                    <div className="flex flex-wrap gap-2">
                      {session.questionsCovered.map((q, i) => (
                        <span key={i} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs">{q}</span>
                      ))}
                    </div>
                  </div>
                )}

                {!!(session.transcript && session.transcript.length) && (
                  <div className="mt-10">
                    <details className="group rounded-xl border border-white/10 bg-white/[0.02] p-5">
                      <summary className="cursor-pointer flex items-center gap-2 text-sm font-semibold">
                        <MessageSquare className="h-4 w-4 text-purple-400" /> Full transcript ({session.transcript.length} turns)
                        <span className="ml-auto text-neutral-500 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                      </summary>
                      <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {session.transcript.map((t, i) => (
                          <div key={i} className={`rounded-lg p-3 border ${t.role === 'assistant' ? 'bg-purple-500/[0.05] border-purple-500/20' : 'bg-white/[0.03] border-white/10'}`}>
                            <p className={`text-xs uppercase tracking-wider mb-1 font-semibold ${t.role === 'assistant' ? 'text-purple-300' : 'text-emerald-300'}`}>
                              {t.role === 'assistant' ? '🎭 Interviewer' : '👤 You'}
                            </p>
                            <p className="text-sm text-neutral-200 whitespace-pre-wrap">{t.content}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                <div className="mt-12 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white h-12 px-6 shadow-lg shadow-rose-500/25">
                    <Link href="/live/new"><RotateCcw className="h-4 w-4 mr-1" /> Practice again</Link>
                  </Button>
                  <ExportPdfButton targetId="report-root" filename={`MockMate-Live-${session.role.replace(/\s+/g,'-')}-Report.pdf`} />
                  <Button asChild variant="outline" size="lg" className="h-12 px-6 border-white/10 bg-white/[0.03] hover:bg-white/[0.06]">
                    <Link href="/dashboard"><Home className="h-4 w-4 mr-1" /> Dashboard</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
