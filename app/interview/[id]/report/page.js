'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Lightbulb, Sparkles, ArrowLeft, Loader2, Trophy, RotateCcw, Home } from 'lucide-react'
import { ExportPdfButton } from '@/components/mockmate/pdf-export'

export default function ReportPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push('/login')
      return
    }
    fetch(`/api/interviews/${id}`)
      .then(r => r.json())
      .then(j => {
        if (!j.interview) { router.push('/dashboard'); return }
        setInterview(j.interview)
      })
      .finally(() => setLoading(false))
  }, [id, router, session, status])

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
    </main>
  )
  if (!interview) return null

  const score = interview.overall ?? 0
  const grade = score >= 85 ? 'Outstanding' : score >= 70 ? 'Strong' : score >= 50 ? 'Decent' : score >= 30 ? 'Needs work' : 'Rough'
  const scoreColor = score >= 75 ? 'emerald' : score >= 50 ? 'amber' : 'rose'

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

      <div className="max-w-4xl mx-auto" id="report-root">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl border border-white/10 p-10 relative overflow-hidden">
          <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs mb-4">
              <Trophy className="h-3.5 w-3.5 text-yellow-400" /> <span className="gradient-text font-medium">INTERVIEW REPORT</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{interview.role}</h1>
            <p className="text-neutral-400 mt-2">{interview.level} · {interview.type?.replace('_', ' ')} · {new Date(interview.createdAt).toLocaleDateString()}</p>

            <div className="mt-10 flex flex-col md:flex-row items-start md:items-center gap-8">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                className="relative">
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
                <p className="text-lg leading-relaxed text-neutral-100">{interview.summary}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-12">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-6">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-4 uppercase text-xs tracking-wider">
                  <CheckCircle2 className="h-4 w-4" /> Strengths
                </div>
                <ul className="space-y-3 text-sm text-neutral-200">
                  {(interview.strengths || []).map((s, i) => <li key={i} className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span> <span>{s}</span></li>)}
                </ul>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.05] p-6">
                <div className="flex items-center gap-2 text-rose-400 font-bold mb-4 uppercase text-xs tracking-wider">
                  <XCircle className="h-4 w-4" /> Weaknesses
                </div>
                <ul className="space-y-3 text-sm text-neutral-200">
                  {(interview.weaknesses || []).map((s, i) => <li key={i} className="flex gap-2"><span className="text-rose-400 mt-0.5">✗</span> <span>{s}</span></li>)}
                </ul>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] p-6">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-4 uppercase text-xs tracking-wider">
                  <Lightbulb className="h-4 w-4" /> Improvement tips
                </div>
                <ul className="space-y-3 text-sm text-neutral-200">
                  {(interview.tips || []).map((s, i) => <li key={i} className="flex gap-2"><span className="text-amber-400 mt-0.5">→</span> <span>{s}</span></li>)}
                </ul>
              </motion.div>
            </div>

            <div className="mt-12">
              <h3 className="font-bold text-lg mb-5">Per-question breakdown</h3>
              <div className="space-y-3">
                {interview.questions.map((q, i) => {
                  const c = (q.score ?? 0) >= 7 ? 'emerald' : (q.score ?? 0) >= 4 ? 'amber' : 'rose'
                  return (
                    <details key={q.id} className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors">
                      <summary className="cursor-pointer flex items-center justify-between gap-4">
                        <span className="text-sm flex-1"><span className="text-neutral-500 mr-2">Q{i + 1}.</span>{q.prompt}</span>
                        <span className={`shrink-0 rounded-full bg-${c}-500/20 text-${c}-400 text-xs px-3 py-1 font-bold border border-${c}-500/30`}>{q.score ?? '-'}/10</span>
                      </summary>
                      <div className="mt-4 space-y-4 pl-6 border-l-2 border-white/10">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-neutral-500 mb-1 font-semibold">Your answer</p>
                          <p className="text-sm whitespace-pre-wrap text-neutral-300 leading-relaxed">{q.answer || <em className="text-neutral-600">(skipped)</em>}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-purple-400 mb-1 font-semibold">AI Feedback</p>
                          <p className="text-sm whitespace-pre-wrap text-neutral-200 leading-relaxed">{q.feedback || '—'}</p>
                        </div>
                      </div>
                    </details>
                  )
                })}
              </div>
            </div>

            <div className="mt-12 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white h-12 px-6 shadow-lg shadow-purple-500/25">
                <Link href="/interview/new"><RotateCcw className="h-4 w-4 mr-1" /> Practice again</Link>
              </Button>
              <ExportPdfButton targetId="report-root" filename={`MockMate-${interview.role.replace(/\s+/g,'-')}-Report.pdf`} />
              <Button asChild variant="outline" size="lg" className="h-12 px-6 border-white/10 bg-white/[0.03] hover:bg-white/[0.06]">
                <Link href="/dashboard"><Home className="h-4 w-4 mr-1" /> Dashboard</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
