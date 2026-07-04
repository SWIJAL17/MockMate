'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { fetchCurrentUser } from '@/lib/mockmate/session'
import { Button } from '@/components/ui/button'
import { Check, Sparkles, ArrowLeft, Zap, Crown, Loader2 } from 'lucide-react'

const TIERS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    tagline: 'For everyone starting out',
    features: [
      'Unlimited text interviews',
      'AI feedback per answer',
      'Personalized questions (paste resume)',
      '1 live video interview / month',
      'Basic analytics',
      'PDF export of reports',
    ],
    cta: 'Current plan',
    highlight: false,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 19,
    tagline: 'For serious job hunters',
    features: [
      'Everything in Free',
      'Unlimited live video interviews',
      'All 6 interviewer personas',
      'Advanced analytics + trends',
      'Priority AI (faster responses)',
      'PDF resume upload',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
]

export default function PricingPage() {
  const [user, setUser] = useState(null)
  const [loadingId, setLoadingId] = useState(null)

  useEffect(() => { fetchCurrentUser().then(setUser) }, [])

  const startCheckout = async (tierId) => {
    setLoadingId(tierId)
    try {
      const r = await fetch('/api/billing/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ tier: tierId }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Checkout unavailable')
      if (j.url) window.location.href = j.url
    } catch (e) { toast.error(e.message) }
    finally { setLoadingId(null) }
  }

  return (
    <main className="min-h-screen bg-black text-white bg-grid-pattern relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-purple-500/20 blur-3xl" />

      <nav className="relative z-20 px-6 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-black/40">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-2 font-bold">
          <Sparkles className="h-5 w-5 text-purple-400" /> MockMate
        </div>
      </nav>

      <section className="relative max-w-5xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs mb-4">
            <Crown className="h-3.5 w-3.5 text-amber-400" /> <span className="gradient-text font-medium">PRICING</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Simple, honest <span className="gradient-text">pricing</span></h1>
          <p className="text-neutral-400 mt-4 text-lg">Start free. Upgrade when you’re ready to go all-in.</p>
        </motion.div>

        <div className="mt-14 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {TIERS.map((tier, idx) => {
            const isCurrent = user?.plan === tier.id || (!user?.plan && tier.id === 'FREE')
            return (
              <motion.div key={tier.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                className={`relative rounded-3xl border p-8 overflow-hidden ${tier.highlight ? 'border-purple-500/40 bg-gradient-to-br from-purple-500/[0.08] to-pink-500/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold px-3 py-1 shadow-lg">
                      <Zap className="h-3 w-3" /> RECOMMENDED
                    </span>
                  </div>
                )}
                <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-40" style={{ background: tier.highlight ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.05)' }} />
                <div className="relative">
                  <h3 className="text-2xl font-bold">{tier.name}</h3>
                  <p className="text-neutral-400 text-sm mt-1">{tier.tagline}</p>
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold">${tier.price}</span>
                    <span className="text-neutral-400 text-sm">/ month</span>
                  </div>
                  <ul className="mt-8 space-y-3">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-neutral-200">
                        <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${tier.highlight ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-neutral-400'}`}>
                          <Check className="h-3 w-3" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    {isCurrent ? (
                      <Button disabled variant="outline" className="w-full h-11 border-white/10 bg-white/5">
                        <Check className="h-4 w-4 mr-1" /> Current plan
                      </Button>
                    ) : (
                      <Button onClick={() => startCheckout(tier.id)} disabled={loadingId === tier.id}
                        className={`w-full h-11 ${tier.highlight ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' : 'bg-white/10 hover:bg-white/15 text-white'}`}>
                        {loadingId === tier.id ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting…</> : tier.cta}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-14 text-center text-sm text-neutral-500">
          <p>All plans include a 14-day money-back guarantee. Cancel anytime.</p>
          <p className="mt-2">Questions? <Link href="/" className="text-purple-300 hover:underline">Contact us</Link></p>
        </div>
      </section>
    </main>
  )
}
