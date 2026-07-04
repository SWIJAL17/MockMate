'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Spotlight } from '@/components/aceternity/spotlight'
import { BackgroundBeams } from '@/components/aceternity/background-beams'
import { TextGenerateEffect } from '@/components/aceternity/text-generate'
import { BentoGrid, BentoGridItem } from '@/components/aceternity/bento-grid'
import { HoverEffect } from '@/components/aceternity/card-hover-effect'
import { FloatingNav } from '@/components/aceternity/floating-nav'
import { Button } from '@/components/ui/button'
import { fetchCurrentUser } from '@/lib/mockmate/session'
import { Brain, Sparkles, Target, MessageSquare, BarChart3, Zap, Home, ArrowRight, Play, ShieldCheck, Rocket, LineChart, Video } from 'lucide-react'

function App() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState(null)
  useEffect(() => {
    setMounted(true)
    fetchCurrentUser().then(setUser)
  }, [])

  const primaryHref = user ? '/dashboard' : '/signup'
  const primaryLabel = user ? 'Open dashboard' : 'Start free interview'

  return (
    <main className="relative min-h-screen bg-black text-white antialiased overflow-hidden">
      <FloatingNav navItems={[
        { name: 'Home', link: '#top', icon: <Home className="h-4 w-4" /> },
        { name: 'Dashboard', link: '/dashboard' },
        { name: 'Resume ATS', link: '/resume' },
        { name: 'Features', link: '#features' },
        { name: 'How it works', link: '#how' },
        { name: 'Pricing', link: '/pricing' },
        { name: 'FAQ', link: '#faq' },
        { name: 'Sign In', link: '/login' },
      ]} />

      {/* HERO */}
      <section id="top" className="relative h-[100vh] w-full flex items-center justify-center overflow-hidden bg-grid-pattern">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black" />
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs backdrop-blur-sm mb-8">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-neutral-300">Powered by MockMate AI · Your Interview Coach</span>
          </motion.div>

          <h1 className="font-display text-5xl md:text-8xl font-extrabold tracking-tight leading-[1.05]">
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-500">Ace every</span>
            <br />
            <span className="gradient-text">interview.</span>
          </h1>

          {mounted && (
            <div className="mt-6 text-neutral-400 max-w-2xl mx-auto text-base md:text-lg">
              <TextGenerateEffect words="Realistic AI-driven mock interviews. Instant, honest feedback. Personalized coaching that scales. Land your dream role with MockMate." />
            </div>
          )}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white shadow-lg shadow-purple-500/25 text-base font-bold rounded-xl">
              <Link href="/dashboard">Go to Command Center Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" className="h-12 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-90 text-white shadow-lg shadow-emerald-500/25 text-base font-bold rounded-xl">
              <Link href="/resume">Resume ATS Suite</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white font-semibold rounded-xl">
              <Link href="/live/new">
                <Video className="h-4 w-4 mr-2 text-rose-400" /> Live Video Call
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white font-semibold rounded-xl">
              <Link href="#how"><Play className="h-4 w-4 mr-2" /> See how it works</Link>
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
            className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Secure OAuth sign-in</div>
            <div className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-purple-400" /> 30-second setup</div>
            <div className="flex items-center gap-1.5"><Rocket className="h-3.5 w-3.5 text-pink-400" /> Personalized AI coaching</div>
          </motion.div>
        </div>
      </section>

      {/* LOGO CLOUD */}
      <section className="relative py-10 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-neutral-500 mb-6">Prepare for interviews at</p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-neutral-400 font-semibold text-lg">
            {['Google', 'Meta', 'Amazon', 'Netflix', 'Stripe', 'Airbnb', 'Microsoft'].map(x => (
              <span key={x} className="opacity-60 hover:opacity-100 transition-opacity">{x}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-28 px-6">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs mb-4">
            <span className="gradient-text font-medium">FEATURES</span>
          </div>
          <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight">Everything you need to <span className="gradient-text">prepare</span></h2>
          <p className="text-neutral-400 mt-4 text-lg">Purpose-built AI that acts like your senior mentor — not a chatbot.</p>
        </div>
        <BentoGrid>
          <BentoGridItem
            title="Role-aware questions"
            description="Tailored to your target role, level, and focus areas. Progressive difficulty for realistic loops."
            icon={<Target className="h-5 w-5 text-purple-400" />}
            header={<div className="h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/10 border border-white/5 relative overflow-hidden"><div className="absolute inset-0 bg-grid-pattern opacity-30" /></div>}
          />
          <BentoGridItem
            title="Instant AI feedback"
            description="Per-answer 0–10 scoring with specific, actionable notes. See exactly what to fix."
            icon={<Zap className="h-5 w-5 text-pink-400" />}
            header={<div className="h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-pink-500/30 to-orange-500/10 border border-white/5" />}
          />
          <BentoGridItem
            title="Deep final report"
            description="Overall score, strengths, weaknesses, and a personalized improvement plan."
            icon={<BarChart3 className="h-5 w-5 text-emerald-400" />}
            header={<div className="h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/10 border border-white/5" />}
          />
          <BentoGridItem
            className="md:col-span-2"
            title="Practice like it's real"
            description="Sequential Q&A with progressive difficulty — just like a real onsite loop at a top tech company."
            icon={<MessageSquare className="h-5 w-5 text-purple-400" />}
            header={<div className="h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-500/30 via-indigo-500/20 to-blue-500/10 border border-white/5" />}
          />
          <BentoGridItem
            title="5 interview modes"
            description="Technical • Behavioral • System Design • HR • Mixed."
            icon={<Brain className="h-5 w-5 text-yellow-400" />}
            header={<div className="h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-yellow-500/30 to-red-500/10 border border-white/5" />}
          />
        </BentoGrid>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-28 px-6">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs mb-4">
              <span className="gradient-text font-medium">HOW IT WORKS</span>
            </div>
            <h2 className="font-display text-4xl md:text-6xl font-bold">Three steps to <span className="gradient-text">confidence</span></h2>
          </div>
          <HoverEffect items={[
            { title: '1. Set your target', description: 'Pick role, level, focus areas, and interview type. Takes 30 seconds.', link: '/interview/new', icon: <Target className="h-6 w-6 text-purple-400" /> },
            { title: '2. Take the interview', description: 'Answer AI-generated questions, one at a time. Get scored instantly.', link: '/interview/new', icon: <MessageSquare className="h-6 w-6 text-pink-400" /> },
            { title: '3. Get your report', description: 'Overall score, strengths, weaknesses, and specific tips to improve.', link: '/dashboard', icon: <LineChart className="h-6 w-6 text-emerald-400" /> },
          ]} />
        </div>
        <BackgroundBeams />
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-12">Common questions</h2>
          <div className="space-y-3">
            {[
              { q: 'Is MockMate free to try?', a: 'Yes! Simply sign in with Google or GitHub to start practicing your mock interviews immediately.' },
              { q: 'What roles are supported?', a: 'Any role you type. Software engineer, PM, designer, data scientist, sales — the AI adapts.' },
              { q: 'How realistic is the AI feedback?', a: 'The model is prompted like a strict senior interviewer. Feedback is specific, blunt, and actionable — no generic fluff.' },
              { q: 'Is my data private?', a: 'Yes. Your interviews are encrypted and tied securely to your authenticated Google or GitHub account.' },
            ].map((item, i) => (
              <details key={i} className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors">
                <summary className="cursor-pointer flex items-center justify-between text-base font-medium">
                  {item.q}
                  <span className="ml-4 text-neutral-400 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-neutral-400 text-sm">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 px-6 text-center">
        <div className="max-w-3xl mx-auto glass rounded-3xl p-12 relative overflow-hidden">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-purple-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-pink-500/30 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-4xl md:text-6xl font-bold">Ready to <span className="gradient-text">nail it</span>?</h2>
            <p className="text-neutral-400 mt-4 text-lg">Your next role starts with your next mock.</p>
            <Button asChild size="lg" className="mt-10 h-12 px-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white shadow-xl shadow-purple-500/30 font-semibold">
              <Link href="/login">Sign In & Start Practicing <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="py-10 text-center text-neutral-500 text-sm border-t border-white/5">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="font-semibold text-neutral-300">MockMate</span>
        </div>
        © {new Date().getFullYear()} MockMate. Crafted for candidates who don’t settle.
      </footer>
    </main>
  )
}

export default App
