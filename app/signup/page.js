'use client'

import { useState, useTransition, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Meteors } from '@/components/aceternity/meteors'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function GitHubIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

function SignupForm() {
  const router = useRouter()
  const search = useSearchParams()
  const next = search.get('next') || '/dashboard'
  const [pending, start] = useTransition()
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingGithub, setLoadingGithub] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const handleOAuth = async (provider) => {
    if (provider === 'google') setLoadingGoogle(true)
    else setLoadingGithub(true)
    await signIn(provider, { callbackUrl: next })
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email || !form.password) {
      return toast.error('Please fill in all required fields')
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters long')
    }

    start(async () => {
      try {
        const r = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const j = await r.json()
        if (!r.ok) {
          throw new Error(j.error || 'Failed to create account')
        }
        
        toast.success('Account created! Logging you in automatically...')
        
        // Automatically sign in with NextAuth after registration
        const loginRes = await signIn('credentials', {
          email: form.email,
          password: form.password,
          redirect: false,
        })

        if (loginRes?.error) {
          toast.error('Account created, but automatic login failed. Please sign in.')
          router.push('/login')
        } else {
          router.push(next)
          router.refresh()
        }
      } catch (err) {
        toast.error(err.message || 'Signup failed. Please try again.')
      }
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white bg-grid-pattern px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 h-[400px] w-[400px] rounded-full bg-pink-500/15 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500 via-purple-500 to-indigo-500 flex items-center justify-center mb-4 shadow-2xl shadow-purple-500/30"
          >
            <Sparkles className="h-7 w-7 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create your <span className="gradient-text">MockMate</span> account
          </h1>
          <p className="text-neutral-400 mt-2 text-sm">
            Start AI mock interviews, ATS resume audits, and career coaching.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/80 backdrop-blur-xl p-8 shadow-2xl">
          <Meteors number={12} />

          {/* Instant OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuth('google')}
              disabled={loadingGoogle || pending}
              className="h-11 border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2"
            >
              {loadingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuth('github')}
              disabled={loadingGithub || pending}
              className="h-11 border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2"
            >
              {loadingGithub ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitHubIcon className="h-4 w-4" />}
              GitHub
            </Button>
          </div>

          <div className="relative flex items-center justify-center mb-6 z-10">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-neutral-950 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 absolute">
              Or register with email
            </span>
          </div>

          {/* Email / Password Registration Form */}
          <form onSubmit={submit} className="space-y-4 relative z-10">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-neutral-300">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  id="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-11 pl-10 bg-white/5 border-white/10 text-sm focus:border-purple-500/50 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-neutral-300">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-11 pl-10 bg-white/5 border-white/10 text-sm focus:border-purple-500/50 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-neutral-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="h-11 pl-10 pr-10 bg-white/5 border-white/10 text-sm focus:border-purple-500/50 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={pending}
              className="w-full h-12 bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 transition-all text-sm flex items-center justify-center gap-2 mt-2"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating Account…
                </>
              ) : (
                <>
                  Create Free Account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-[11px] text-neutral-500 text-center leading-relaxed mt-2">
              By creating an account, you agree to our Terms of Service &amp; Privacy Policy.
            </p>
          </form>

          <div className="relative z-10 mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-neutral-400">
              Already have an account?{' '}
              <Link href="/login" className="text-purple-400 hover:text-purple-300 font-bold ml-1 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
