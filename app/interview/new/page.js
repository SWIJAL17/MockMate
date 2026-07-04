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
import { Sparkles, Loader2, ArrowLeft, Zap } from 'lucide-react'
import { ResumeUpload } from '@/components/mockmate/resume-upload'

const LEVELS = ['Intern', 'Junior', 'Mid', 'Senior', 'Staff', 'Principal']
const TYPES = [
  { v: 'TECHNICAL', l: 'Technical', d: 'Coding + tech concepts' },
  { v: 'BEHAVIORAL', l: 'Behavioral', d: 'STAR-format stories' },
  { v: 'SYSTEM_DESIGN', l: 'System Design', d: 'Scalable architecture' },
  { v: 'HR', l: 'HR / Culture', d: 'Motivations & fit' },
  { v: 'MIXED', l: 'Mixed', d: 'A bit of everything' },
]

export default function NewInterviewPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [pending, start] = useTransition()
  const [form, setForm] = useState({ role: '', level: 'Mid', type: 'MIXED', focus: '', count: 6, resume: '' })
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
        const res = await fetch('/api/interviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || 'Failed to start')
        toast.success('Interview created!')
        router.push(`/interview/${j.interview.id}`)
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
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs mb-4 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Configure your interview
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Let's tailor <br /> this to <span className="gradient-text">you</span></h1>
          <p className="text-neutral-400 mt-3">The more specific your target, the sharper the questions.</p>
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onSubmit={submit}
          className="mt-10 space-y-6 glass rounded-2xl border border-white/10 p-8 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="space-y-2 relative">
            <Label className="text-sm font-medium">Target role</Label>
            <Input placeholder="e.g., Senior Frontend Engineer, Product Manager, Data Scientist"
              value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="h-12 bg-white/5 border-white/10 focus:border-purple-500/50" required />
          </div>

          <div className="grid grid-cols-2 gap-4 relative">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Level</Label>
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="h-12 w-full rounded-md border border-white/10 bg-white/5 px-4 text-sm focus:border-purple-500/50 focus:outline-none">
                {LEVELS.map((l) => <option key={l} value={l} className="bg-neutral-900">{l}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Interview type</Label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="h-12 w-full rounded-md border border-white/10 bg-white/5 px-4 text-sm focus:border-purple-500/50 focus:outline-none">
                {TYPES.map((t) => <option key={t.v} value={t.v} className="bg-neutral-900">{t.l}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2 relative">
            <Label className="text-sm font-medium">Focus areas <span className="text-neutral-500 font-normal">(optional)</span></Label>
            <Input placeholder="e.g., React performance, distributed systems, leadership stories"
              value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })}
              className="h-12 bg-white/5 border-white/10 focus:border-purple-500/50" />
          </div>

          <div className="space-y-2 relative">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-sm font-medium">Paste your resume <span className="text-neutral-500 font-normal">(optional — gets you personalized questions)</span></Label>
              <ResumeUpload accent="purple" onExtracted={(text) => setForm(f => ({ ...f, resume: text }))} />
            </div>
            <textarea placeholder="Paste your resume text here — OR upload a PDF above. The AI will craft questions specifically about your experience, projects, and skills."
              value={form.resume} onChange={(e) => setForm({ ...form, resume: e.target.value })}
              className="min-h-[120px] w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder:text-neutral-500 focus:border-purple-500/50 focus:outline-none resize-y" />
          </div>

          <div className="space-y-3 relative">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Number of questions</Label>
              <span className="text-sm text-purple-400 font-semibold">{form.count}</span>
            </div>
            <input type="range" min={3} max={10} value={form.count}
              onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
              className="w-full accent-purple-500" />
            <div className="flex justify-between text-xs text-neutral-500"><span>3</span><span>10</span></div>
          </div>

          <Button type="submit" size="lg"
            className="w-full h-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white shadow-lg shadow-purple-500/25 relative"
            disabled={pending || !form.role}>
            {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating questions with AI…</> : <><Zap className="h-4 w-4 mr-1" /> Start interview</>}
          </Button>
          <p className="text-xs text-neutral-500 text-center">Powered by MockMate AI. Takes ~5 seconds.</p>
        </motion.form>
      </div>
    </main>
  )
}
