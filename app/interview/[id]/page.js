'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { TracingBeam } from '@/components/aceternity/tracing-beam'
import { CheckCircle2, ChevronRight, Loader2, Sparkles, ArrowLeft, Star } from 'lucide-react'
import { AvatarInterviewer, VoiceInputButton } from '@/components/mockmate/avatar-interviewer'

export default function InterviewPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [data, setData] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answer, setAnswer] = useState('')
  const [submitting, startSubmit] = useTransition()
  const [finalizing, startFinalize] = useTransition()

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push('/login')
      return
    }
    fetch(`/api/interviews/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.interview) { toast.error('Interview not found'); router.push('/dashboard'); return }
        setData(j.interview)
        if (j.interview.status === 'COMPLETED') { router.push(`/interview/${id}/report`); return }
        const idx = j.interview.questions.findIndex((q) => !q.answer)
        setCurrent(idx === -1 ? j.interview.questions.length - 1 : idx)
      })
      .catch(() => toast.error('Failed to load'))
  }, [id, router, session, status])

  if (!data) return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white bg-grid-pattern">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        <p className="text-sm text-neutral-400">Loading your interview…</p>
      </div>
    </main>
  )

  const q = data.questions[current]
  const answered = data.questions.filter((x) => x.answer).length
  const progress = (answered / data.questions.length) * 100

  const submit = () => {
    if (!answer.trim()) return toast.error('Type your answer first')
    startSubmit(async () => {
      try {
        const res = await fetch(`/api/interviews/${id}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: q.id, answer }),
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || 'Failed')
        setData((d) => ({ ...d, questions: d.questions.map((x) => x.id === j.question.id ? j.question : x) }))
        setAnswer('')
        toast.success(`Scored ${j.question.score}/10`)
      } catch (e) {
        toast.error(e.message)
      }
    })
  }

  const next = () => {
    if (current < data.questions.length - 1) {
      setCurrent(current + 1)
      setAnswer('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const finish = () => {
    startFinalize(async () => {
      try {
        const res = await fetch(`/api/interviews/${id}/report`, {
          method: 'POST',
        })
        if (!res.ok) throw new Error('Failed')
        toast.success('Report ready!')
        router.push(`/interview/${id}/report`)
      } catch { toast.error('Could not finalize') }
    })
  }

  const allAnswered = data.questions.every((x) => x.answer)

  return (
    <main className="min-h-screen bg-black text-white py-8 px-6 bg-grid-pattern">
      <nav className="max-w-3xl mx-auto flex items-center justify-between mb-6">
        <Link href="/dashboard" className="text-sm text-neutral-400 hover:text-white flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Sparkles className="h-4 w-4 text-purple-400" /> MockMate
        </div>
      </nav>

      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex items-center justify-between text-sm text-neutral-400 mb-2">
          <div><span className="text-white font-semibold">{data.role}</span> · {data.level} · <span className="text-purple-400">{data.type?.replace('_', ' ')}</span></div>
          <div className="font-mono text-xs">Q{current + 1} / {data.questions.length}</div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
            initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      <TracingBeam className="px-6">
        <div className="max-w-3xl mx-auto space-y-8 pb-32">
          <AnimatePresence mode="wait">
            <motion.div key={q.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-4">
              <AvatarInterviewer text={q.prompt} />
              <div className="glass rounded-2xl border border-white/10 p-8 relative overflow-hidden">
              <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs mb-5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-purple-300">Question {current + 1} of {data.questions.length}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold leading-relaxed tracking-tight">{q.prompt}</h2>

                {!q.answer ? (
                  <div className="mt-8 space-y-4">
                    <Textarea placeholder="Take your time. Structure your answer with clarity. The AI evaluates depth, specificity, and reasoning…"
                      value={answer} onChange={(e) => setAnswer(e.target.value)}
                      className="min-h-[240px] bg-white/5 border-white/10 focus:border-purple-500/50 text-base leading-relaxed" />
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <VoiceInputButton onAppendTranscript={(t) => setAnswer((prev) => (prev ? prev + ' ' : '') + t)} />
                        <p className="text-xs text-neutral-500">{answer.length} chars</p>
                      </div>
                      <Button onClick={submit} disabled={submitting || !answer.trim()}
                        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white h-11 px-6 shadow-lg shadow-purple-500/25">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Evaluating…</> : <>Submit answer <ChevronRight className="h-4 w-4 ml-1" /></>}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 space-y-5">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2 font-semibold">Your answer</p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-neutral-200">{q.answer}</p>
                    </div>
                    <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/[0.08] to-pink-500/[0.05] p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-400" />
                          <p className="text-sm text-purple-300 font-semibold uppercase tracking-wider">AI Feedback</p>
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-sm px-3 py-1 font-bold">
                          <Star className="h-3.5 w-3.5 fill-current" /> {q.score}/10
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-neutral-200">{q.feedback}</p>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      {current < data.questions.length - 1 ? (
                        <Button onClick={next} className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white h-11 px-6">
                          Next question <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : allAnswered ? (
                        <Button onClick={finish} disabled={finalizing}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white h-11 px-6 shadow-lg shadow-emerald-500/25">
                          {finalizing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating report…</> : <>Get my final report <CheckCircle2 className="h-4 w-4 ml-1" /></>}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Question overview strip */}
          <div className="flex flex-wrap gap-2 pt-4">
            {data.questions.map((qq, i) => (
              <button key={qq.id} onClick={() => { setCurrent(i); setAnswer('') }}
                className={`h-9 w-9 rounded-lg text-xs font-semibold border transition-all ${
                  i === current ? 'border-purple-500 bg-purple-500/20 text-white' :
                  qq.answer ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' :
                  'border-white/10 bg-white/[0.03] text-neutral-500 hover:text-white'
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </TracingBeam>
    </main>
  )
}
