'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, Mail, Lock, User, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

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

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('signin') // 'signin' or 'signup'
  
  // Loading states
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingGithub, setLoadingGithub] = useState(false)
  const [loadingManual, setLoadingManual] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleOAuth = async (provider) => {
    if (provider === 'google') setLoadingGoogle(true)
    else setLoadingGithub(true)
    await signIn(provider, { callbackUrl: '/dashboard' })
  }

  const handleManualSignIn = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please enter email and password')
    setLoadingManual(true)
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (res?.error) {
        toast.error('Invalid email or password')
      } else {
        toast.success('Signed in successfully!')
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoadingManual(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email || !password) return toast.error('Please fill in all fields')
    if (password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoadingManual(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account')
      }
      toast.success('Account created! Logging you in...')
      // Automatically log them in
      const loginRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (loginRes?.error) {
        toast.error('Account created, please sign in manually')
        setMode('signin')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoadingManual(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden bg-grid-pattern py-12">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-pink-500/15 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-2xl shadow-purple-500/30"
          >
            <Sparkles className="h-7 w-7 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === 'signin' ? 'Welcome back to ' : 'Get started with '}
            <span className="gradient-text">MockMate</span>
          </h1>
          <p className="text-neutral-400 mt-2 text-sm">
            {mode === 'signin' ? 'Sign in to access your practice sessions' : 'Create your free account to start practicing'}
          </p>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-8 space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] border border-white/10 relative z-10">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={mode === 'signin' ? handleManualSignIn : handleRegister} className="space-y-4 relative z-10">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-300">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-11 pl-10 bg-white/5 border-white/10 text-sm focus:border-purple-500/50 rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-neutral-300">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 pl-10 bg-white/5 border-white/10 text-sm focus:border-purple-500/50 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-neutral-300">Password</Label>
                {mode === 'signup' && <span className="text-[10px] text-neutral-500">Min. 6 characters</span>}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'signup' ? 6 : undefined}
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
              disabled={loadingManual || loadingGoogle || loadingGithub}
              className="w-full h-11 mt-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white font-semibold text-sm rounded-xl shadow-lg shadow-purple-500/25 transition-all"
            >
              {loadingManual ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : mode === 'signin' ? (
                <>Sign In <ArrowRight className="h-4 w-4 ml-1.5" /></>
              ) : (
                <>Create Free Account <CheckCircle2 className="h-4 w-4 ml-1.5" /></>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative py-2 z-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-semibold">
              <span className="bg-neutral-950 px-3 text-neutral-500 rounded">Or continue with</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-2.5 relative z-10">
            <Button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={loadingGoogle || loadingGithub || loadingManual}
              className="w-full h-11 bg-white hover:bg-neutral-100 text-neutral-900 font-medium text-sm rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              {loadingGoogle ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <GoogleIcon className="h-4 w-4 mr-2.5" />
              )}
              Google
            </Button>

            <Button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={loadingGoogle || loadingGithub || loadingManual}
              className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm rounded-xl border border-white/10 transition-all hover:shadow-md hover:shadow-purple-500/10 hover:-translate-y-0.5"
            >
              {loadingGithub ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <GitHubIcon className="h-4 w-4 mr-2.5" />
              )}
              GitHub
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-500 mt-6">
          {mode === 'signin' ? "Don't have an account yet? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-purple-400 hover:text-purple-300 font-medium underline underline-offset-4"
          >
            {mode === 'signin' ? 'Create one now' : 'Sign in here'}
          </button>
        </p>
      </motion.div>
    </main>
  )
}
