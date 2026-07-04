'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Spotlight } from '@/components/aceternity/spotlight'
import { Video, Loader2, ArrowLeft, Sparkles, ShieldCheck, Timer, Mic } from 'lucide-react'
import { ResumeUpload } from '@/components/mockmate/resume-upload'
import { PersonaPicker } from '@/components/mockmate/persona-picker'

const LEVELS = ['Intern', 'Junior', 'Mid', 'Senior', 'Staff', 'Principal']
const TYPES = [
  { v: 'TECHNICAL', l: 'Technical' },
  { v: 'BEHAVIORAL', l: 'Behavioral' },
  { v: 'SYSTEM_DESIGN', l: 'System Design' },
  { v: 'HR', l: 'HR / Culture' },
  { v: 'MIXED', l: 'Mixed' },
]

export default function NewLivePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [pending, start] = useTransition()
  const [form, setForm] = useState({ role: '', level: 'Mid', type: 'MIXED', focus: '', resume: '', replicaId: '' })
  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push('/login')
      return
    }
    try {
      const prep = localStorage.getItem('mockmate_tailored_prep')
      if (prep) {
        const data = JSON.parse(prep)
        setForm((prev) => ({
          ...prev,
          role: data.role || prev.role,
          focus: data.focus || prev.focus,
          resume: data.resume || prev.resume,
        }))
        toast.success('Pre-filled with your tailored AI Resume analysis!')
        localStorage.removeItem('mockmate_tailored_prep')
      }
    } catch {}
  }, [status, session, router])

  const submit = (e) => {
    e.preventDefault()
    if (!form.role.trim()) return toast.error('Enter a target role')
    start(async () => {
      try {
        const res = await fetch('/api/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || 'Failed to start')
        toast.success('Interviewer is connecting…')
        router.push(`/live/${j.session.id}`)
      } catch (err) {
        toast.error(err.message || 'Something went wrong')
      }
    })
  }

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden bg-grid-pattern">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black pointer-events-none" />

      <nav className="relative z-20 px-6 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-black/40">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="flex items-center gap-2 font-bold">
          <Sparkles className="h-5 w-5 text-purple-400" /> MockMate
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-14 relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs mb-4 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
            <Video className="h-3.5 w-3.5 text-rose-400" />
            <span className="text-rose-200">LIVE Video · Powered by MockMate AI</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Face a real <br /> <span className="gradient-text">AI interviewer</span></h1>
          <p className="text-neutral-400 mt-3 text-lg">Photorealistic video call. She sees you, hears you, responds in real time. Just like a real interview.</p>
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onSubmit={submit}
          className="mt-10 space-y-6 glass rounded-2xl border border-white/10 p-8 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl" />

          <div className="space-y-2 relative">
            <Label className="text-sm font-medium">Target role</Label>
            <Input placeholder="e.g., Senior Frontend Engineer, Product Manager"
              value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="h-12 bg-white/5 border-white/10 focus:border-rose-500/50" required />
          </div>

          <div className="grid grid-cols-2 gap-4 relative">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Level</Label>
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="h-12 w-full rounded-md border border-white/10 bg-white/5 px-4 text-sm focus:border-rose-500/50 focus:outline-none">
                {LEVELS.map((l) => <option key={l} value={l} className="bg-neutral-900">{l}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Interview type</Label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="h-12 w-full rounded-md border border-white/10 bg-white/5 px-4 text-sm focus:border-rose-500/50 focus:outline-none">
                {TYPES.map((t) => <option key={t.v} value={t.v} className="bg-neutral-900">{t.l}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2 relative">
            <Label className="text-sm font-medium">Focus areas <span className="text-neutral-500 font-normal">(optional)</span></Label>
            <Input placeholder="e.g., React performance, system design, leadership"
              value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })}
              className="h-12 bg-white/5 border-white/10 focus:border-rose-500/50" />
          </div>

          <div className="space-y-3 relative">
            <Label className="text-sm font-medium">Choose your interviewer</Label>
            <PersonaPicker value={form.replicaId} onChange={(id) => setForm({ ...form, replicaId: id })} />
          </div>

          <div className="space-y-2 relative">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-sm font-medium">Paste your resume <span className="text-neutral-500 font-normal">(optional — personalizes the interview)</span></Label>
              <ResumeUpload accent="rose" onExtracted={(text) => setForm(f => ({ ...f, resume: text }))} />
            </div>
            <textarea placeholder="Paste your resume text here — OR upload a PDF above. The interviewer will ask about your actual experience."
              value={form.resume} onChange={(e) => setForm({ ...form, resume: e.target.value })}
              className="min-h-[120px] w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder:text-neutral-500 focus:border-rose-500/50 focus:outline-none resize-y" />
          </div>

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5"><Mic className="h-3.5 w-3.5 text-rose-400" /> Camera + mic required</div>
            <div className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5 text-amber-400" /> Max 15 min</div>
            <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Ended automatically</div>
          </div>

          <Button type="submit" size="lg"
            className="w-full h-12 bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:opacity-90 text-white shadow-lg shadow-rose-500/25 relative"
            disabled={pending || !form.role}>
            {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting to interviewer…</> : <><Video className="h-4 w-4 mr-1" /> Start live video interview</>}
          </Button>
          <p className="text-xs text-neutral-500 text-center">Uses your webcam and microphone. Ends automatically after 15 min.</p>
        </motion.form>
      </div>
    </main>
  )
}
