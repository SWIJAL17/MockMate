'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { getUserId, getUserName } from '@/lib/mockmate/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spotlight } from '@/components/aceternity/spotlight'
import { Footer } from '@/components/mockmate/footer'
import {
  Sparkles, Plus, Trophy, Clock, Trash2, ArrowLeft, Video, LogOut, User,
  FileText, TrendingUp, ShieldCheck, Zap, Search, CheckCircle2, AlertCircle,
  BarChart3, Award, ChevronRight, Flame, Target, ArrowUpRight, Activity,
  RefreshCw, Filter, ArrowUpDown, Eye, Play, Check, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

// Recharts is heavy and browser-only; keep it out of SSR (see components/ui/chart.jsx note).
const InsightsPanel = dynamic(() => import('@/components/mockmate/insights-panel'), {
  ssr: false,
  loading: () => <div className="h-72 rounded-3xl bg-white/[0.03] border border-white/10 animate-pulse" />,
})

export default function DashboardPage() {
  const { data: session } = useSession()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL', 'TEXT', 'LIVE'
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL', 'COMPLETED', 'IN_PROGRESS'
  const [sortBy, setSortBy] = useState('NEWEST') // 'NEWEST', 'OLDEST', 'HIGHEST_SCORE'

  const fetchListSafe = useCallback(async (signal) => {
    if (!session?.user) return
    setLoading(true)
    setError(null)
    try {
      const [resText, resLive] = await Promise.all([
        fetch('/api/interviews', { signal }),
        fetch('/api/live', { signal }),
      ])

      const dataText = resText.ok ? await resText.json() : { interviews: [] }
      const dataLive = resLive.ok ? await resLive.json() : { sessions: [] }

      const textOnes = (dataText.interviews || []).map((x) => ({ ...x, kind: 'TEXT' }))
      const liveOnes = (dataLive.sessions || []).map((x) => ({ ...x, kind: 'LIVE' }))
      const merged = [...textOnes, ...liveOnes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      
      setInterviews(merged)
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Dashboard telemetry sync failed:', err)
        setError('Failed to sync latest interview telemetry.')
        toast.error('Network sync error. Please try refreshing.')
      }
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (!session) return
    const controller = new AbortController()
    fetchListSafe(controller.signal)
    return () => controller.abort()
  }, [session, fetchListSafe])

  const handleDeleteSession = async (item, e) => {
    e.preventDefault()
    e.stopPropagation()

    const url = item.kind === 'LIVE' ? `/api/live/${item.id}` : `/api/interviews/${item.id}`
    const prevList = [...interviews]

    // Optimistic UI update for instant enterprise snappiness
    setInterviews((list) => list.filter((x) => !(x.id === item.id && x.kind === item.kind)))
    
    toast.promise(fetch(url, { method: 'DELETE' }), {
      loading: 'Removing session transcript from archive...',
      success: 'Session transcript permanently deleted.',
      error: () => {
        setInterviews(prevList) // Rollback on failure
        return 'Failed to delete session transcript.'
      },
    })
  }

  const name = getUserName(session) || session?.user?.name || 'Engineer'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // Calculate Executive KPI Metrics dynamically
  const totalSessions = interviews.length
  const completedSessions = interviews.filter((i) => {
    if (i.kind === 'LIVE') return i.reportStatus === 'READY'
    return i.status === 'COMPLETED' || (i.questions && i.questions.some(q => q.answer))
  })
  const completedWithScores = interviews.filter((i) => i.overall != null && i.overall > 0)
  
  const avgScore = completedWithScores.length > 0
    ? Math.round(completedWithScores.reduce((acc, curr) => acc + curr.overall, 0) / completedWithScores.length)
    : 0

  // Estimate realistic practice time based on session completion and questions answered
  const practiceMinutes = useMemo(() => {
    return interviews.reduce((total, i) => {
      if (i.kind === 'LIVE') {
        return total + (i.reportStatus === 'READY' ? 15 : 5)
      } else {
        const answered = (i.questions || []).filter(q => q.answer).length
        return total + Math.max(3, answered * 3)
      }
    }, 0)
  }, [interviews])

  // Weighted career readiness percentage calculation
  const readinessPercentage = useMemo(() => {
    if (totalSessions === 0) return 15
    const baseProgress = Math.min(40, totalSessions * 8)
    const scoreWeight = avgScore > 0 ? (avgScore * 0.6) : 10
    return Math.min(100, Math.round(baseProgress + scoreWeight))
  }, [totalSessions, avgScore])

  // Filtered & Sorted Sessions
  const filteredInterviews = useMemo(() => {
    return interviews
      .filter((i) => {
        const matchesTab = activeTab === 'ALL' || i.kind === activeTab
        const matchesSearch =
          !searchQuery.trim() ||
          (i.role && i.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (i.level && i.level.toLowerCase().includes(searchQuery.toLowerCase()))
        
        const isCompleted = i.kind === 'LIVE' ? i.reportStatus === 'READY' : i.status === 'COMPLETED'
        const matchesStatus = statusFilter === 'ALL' ||
          (statusFilter === 'COMPLETED' && isCompleted) ||
          (statusFilter === 'IN_PROGRESS' && !isCompleted)

        return matchesTab && matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') return new Date(b.createdAt) - new Date(a.createdAt)
        if (sortBy === 'OLDEST') return new Date(a.createdAt) - new Date(b.createdAt)
        if (sortBy === 'HIGHEST_SCORE') return (b.overall ?? -1) - (a.overall ?? -1)
        return 0
      })
  }, [interviews, activeTab, searchQuery, statusFilter, sortBy])

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden bg-grid-pattern flex flex-col justify-between">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20 pointer-events-none" fill="white" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black pointer-events-none" />

      {/* Top Navigation Header */}
      <nav className="relative z-30 border-b border-white/10 backdrop-blur-xl bg-black/60 px-6 py-4 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-black text-lg tracking-tight">
            <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" /> MockMate<span className="text-purple-400">.AI</span>
          </Link>
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
            <ShieldCheck className="h-3 w-3 text-emerald-400" /> Enterprise Command Center
          </span>
        </div>

        <div className="flex items-center gap-3">
          {session?.user && (
            <div className="flex items-center gap-2.5 bg-neutral-900/90 border border-white/10 px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-200 shadow-md">
              {session.user.image ? (
                <img src={session.user.image} alt="" className="h-6 w-6 rounded-full border border-white/20" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col text-left leading-none">
                <span className="font-bold text-white">{name}</span>
                <span className="text-[10px] text-purple-400 font-mono">Pro Candidate</span>
              </div>
            </div>
          )}
          <Button
            onClick={() => signOut({ callbackUrl: '/login' })}
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-300 hover:border-rose-500/40 h-9 px-3.5 rounded-xl transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
            title="Sign out of MockMate"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-400" />
            <span>Sign Out</span>
          </Button>
        </div>
      </nav>

      {/* Main Command Center Workspace */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 relative z-10 space-y-12">
        {/* HERO GREETING & DAILY COACH TIP */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-xs font-bold text-purple-300">
                <Flame className="h-3.5 w-3.5 text-orange-400 fill-current" /> Daily Career Coach Insight
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                {greeting}, <span className="gradient-text">{name.split(' ')[0]}</span>
              </h1>
              <p className="text-neutral-400 text-sm md:text-base max-w-2xl font-normal leading-relaxed">
                Welcome to your command center. Analyze your resume against rigorous ATS rules, fix keyword gaps with AI, and rehearse for senior technical interviews.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-95 text-white font-bold h-12 px-6 rounded-2xl shadow-lg shadow-emerald-500/25">
                <Link href="/resume">
                  <FileText className="h-4 w-4 mr-2" /> Resume ATS Suite
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-bold h-12 px-6 rounded-2xl shadow-lg shadow-purple-500/25">
                <Link href="/interview/new">
                  <Plus className="h-4 w-4 mr-2" /> New Text Mock
                </Link>
              </Button>
            </div>
          </div>

          {/* Glowing Coach Tip Banner */}
          <div className="glass rounded-2xl border border-purple-500/30 p-4 bg-gradient-to-r from-purple-950/30 via-black to-pink-950/30 flex items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-purple-300 fill-current animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Pro Hiring Strategy</span>
                <p className="text-xs md:text-sm font-semibold text-neutral-200">
                  Resumes tailored specifically to a job description's keywords achieve a <span className="text-emerald-400 font-bold">74% higher callback rate</span>. Always run an ATS scan before submitting!
                </p>
              </div>
            </div>
            <Link href="/resume" className="hidden sm:flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 shrink-0">
              Try ATS Scan <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>

        {/* 4-CARD EXECUTIVE KPI PERFORMANCE STAT GRID */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Practice Sessions */}
          <div className="glass rounded-3xl border border-white/10 p-6 space-y-3 relative overflow-hidden group hover:border-purple-500/40 transition-all shadow-xl">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl group-hover:bg-purple-500/20 transition-all" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Practice Sessions</span>
              <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight">{totalSessions}</span>
              {totalSessions > 0 && (
                <span className="text-xs font-bold text-emerald-400 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" /> {completedSessions.length} Completed
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 font-medium">Text mocks & live video calls</p>
          </div>

          {/* Card 2: Average Assessment Score */}
          <div className="glass rounded-3xl border border-white/10 p-6 space-y-3 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-xl">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Average ATS / Mock Score</span>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Trophy className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-emerald-400">{avgScore}%</span>
              <span className="text-xs font-bold text-neutral-400">/ 100</span>
            </div>
            <p className="text-[11px] text-neutral-500 font-medium">Verified objective grading</p>
          </div>

          {/* Card 3: Practice Time Logged */}
          <div className="glass rounded-3xl border border-white/10 p-6 space-y-3 relative overflow-hidden group hover:border-pink-500/40 transition-all shadow-xl">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-pink-500/10 blur-2xl group-hover:bg-pink-500/20 transition-all" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Time Logged</span>
              <div className="h-9 w-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight">{practiceMinutes}</span>
              <span className="text-xs font-bold text-neutral-400">mins</span>
            </div>
            <p className="text-[11px] text-neutral-500 font-medium">Estimated AI coaching hours</p>
          </div>

          {/* Card 4: Career Readiness Level */}
          <div className="glass rounded-3xl border border-white/10 p-6 space-y-3 relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-xl">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl group-hover:bg-cyan-500/20 transition-all" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Readiness Level</span>
              <div className="h-9 w-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-white">
                {readinessPercentage >= 75 ? 'Senior Ready 🚀' : readinessPercentage >= 50 ? 'Mid-Level Fit ⚡' : 'Developing 🎯'}
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">{readinessPercentage}%</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${readinessPercentage}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* PERFORMANCE INSIGHTS — charts powered by computeAnalytics */}
        {!loading && interviews.length > 0 && <InsightsPanel interviews={interviews} />}

        {/* 3-CARD STYLED QUICK-ACTION FEATURE LAUNCHPAD */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Platform Launchpad</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Select a specialized career coaching suite to initiate your workflow.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Resume ATS Suite */}
            <Link href="/resume" className="group block glass rounded-3xl border border-emerald-500/30 p-7 space-y-5 hover:-translate-y-1 hover:border-emerald-500/60 hover:shadow-2xl hover:shadow-emerald-500/15 transition-all relative overflow-hidden bg-gradient-to-b from-emerald-950/20 to-black">
              <div className="absolute top-0 right-0 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/25 transition-all" />
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                    <FileText className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ATS Workbench
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                  Resume ATS Analyzer & 1-Page Editor
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                  Upload your resume for rigorous, zero-inflation ATS scoring. Use AI to auto-insert missing keywords and compile verbose resumes down to exactly 1 professional page.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-between text-xs font-bold text-emerald-400 border-t border-white/10 group-hover:text-emerald-300">
                <span>Launch Workbench</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Card 2: AI Text Mock Interview */}
            <Link href="/interview/new" className="group block glass rounded-3xl border border-purple-500/30 p-7 space-y-5 hover:-translate-y-1 hover:border-purple-500/60 hover:shadow-2xl hover:shadow-purple-500/15 transition-all relative overflow-hidden bg-gradient-to-b from-purple-950/20 to-black">
              <div className="absolute top-0 right-0 h-36 w-36 rounded-full bg-purple-500/10 blur-3xl group-hover:bg-purple-500/25 transition-all" />
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/20">
                    <Plus className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    STAR Coaching
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-white group-hover:text-purple-300 transition-colors">
                  AI Text Practice Interview
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                  Engage in a structured technical or behavioral chat interview. Receive instant STAR-method evaluations, grammar fixes, and quantified model answers.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-between text-xs font-bold text-purple-400 border-t border-white/10 group-hover:text-purple-300">
                <span>Start Practice Session</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Card 3: Live Video Interview */}
            <Link href="/live/new" className="group block glass rounded-3xl border border-rose-500/30 p-7 space-y-5 hover:-translate-y-1 hover:border-rose-500/60 hover:shadow-2xl hover:shadow-rose-500/15 transition-all relative overflow-hidden bg-gradient-to-b from-rose-950/20 to-black">
              <div className="absolute top-0 right-0 h-36 w-36 rounded-full bg-rose-500/10 blur-3xl group-hover:bg-rose-500/25 transition-all" />
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform shadow-lg shadow-rose-500/20 relative">
                    <Video className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full bg-rose-500 text-white shadow-md animate-pulse">
                    NEW · Live Video AI
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-white group-hover:text-rose-300 transition-colors">
                  Live Video Interview Call
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                  Step into a photorealistic real-time video call with our AI interviewer. Experience genuine conversational pacing, voice recognition, and automated grading.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-between text-xs font-bold text-rose-400 border-t border-white/10 group-hover:text-rose-300">
                <span>Connect Live Camera</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </motion.div>

        {/* SESSION HISTORY & PORTFOLIO WORKBENCH */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-6 pt-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                Interview Transcripts & Evaluations
                {loading && <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">Review your past performance scores, study feedback reports, and track your career trajectory.</p>
            </div>

            {/* Filter Tabs, Sort Dropdown & Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <Input
                  placeholder="Search role or level..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 w-full sm:w-48 bg-white/5 border-white/10 text-xs rounded-xl focus:border-purple-500/50"
                />
              </div>

              {/* Status Filter */}
              <div className="flex bg-neutral-900/90 p-1 rounded-xl border border-white/10 text-xs font-bold">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === 'ALL' ? 'bg-white/15 text-white shadow' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Status: All
                </button>
                <button
                  onClick={() => setStatusFilter('COMPLETED')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setStatusFilter('IN_PROGRESS')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  In Progress
                </button>
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 bg-neutral-900/90 border border-white/10 text-xs font-bold text-neutral-300 rounded-xl px-3 focus:outline-none focus:border-purple-500/50 cursor-pointer"
              >
                <option value="NEWEST">Sort: Newest First</option>
                <option value="OLDEST">Sort: Oldest First</option>
                <option value="HIGHEST_SCORE">Sort: Highest Score</option>
              </select>

              {/* Session Type Switcher */}
              <div className="flex bg-neutral-900/90 p-1 rounded-xl border border-white/10 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'ALL' ? 'bg-purple-500 text-white shadow' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  All ({interviews.length})
                </button>
                <button
                  onClick={() => setActiveTab('TEXT')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'TEXT' ? 'bg-purple-500 text-white shadow' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Text ({interviews.filter((i) => i.kind === 'TEXT').length})
                </button>
                <button
                  onClick={() => setActiveTab('LIVE')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'LIVE' ? 'bg-purple-500 text-white shadow' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Live ({interviews.filter((i) => i.kind === 'LIVE').length})
                </button>
              </div>
            </div>
          </div>

          {/* Error State Banner */}
          {error && (
            <div className="glass rounded-2xl border border-rose-500/30 p-5 bg-rose-950/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-rose-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-rose-200">{error}</p>
                  <p className="text-xs text-neutral-400">Check your network connection or MongoDB database status.</p>
                </div>
              </div>
              <Button
                onClick={() => fetchListSafe()}
                size="sm"
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold h-9 px-4 rounded-xl text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry Sync
              </Button>
            </div>
          )}

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-52 rounded-3xl bg-white/[0.03] border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : filteredInterviews.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-3xl p-16 text-center border border-white/10 relative overflow-hidden shadow-2xl"
            >
              <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-md mx-auto space-y-4">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-extrabold">No matching practice sessions found</h3>
                <p className="text-xs md:text-sm text-neutral-400 leading-relaxed">
                  {searchQuery || activeTab !== 'ALL' || statusFilter !== 'ALL'
                    ? 'Try adjusting your search query, sort dropdown, or filter tabs to view past transcripts.'
                    : 'Your portfolio is empty! Kick off your first AI mock interview or analyze your resume to begin tracking your career readiness.'}
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <Button asChild size="lg" className="h-11 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25">
                    <Link href="/interview/new"><Plus className="h-4 w-4 mr-1.5" /> Start Text Mock</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-11 px-6 border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl">
                    <Link href="/resume"><FileText className="h-4 w-4 mr-1.5" /> Analyze Resume</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInterviews.map((i, idx) => {
                const isLive = i.kind === 'LIVE'
                const answered = isLive ? 0 : (i.questions || []).filter((q) => q.answer).length
                const total = isLive ? 0 : (i.questions || []).length
                const reportReady = isLive ? i.reportStatus === 'READY' : i.status === 'COMPLETED'
                const reportFailed = isLive && i.reportStatus === 'FAILED'
                const reportPending = isLive && (i.reportStatus === 'PROCESSING' || (!i.reportStatus && i.status === 'ended'))
                const displayScore = reportReady ? i.overall ?? 0 : null
                const scoreColor =
                  displayScore == null
                    ? 'from-purple-500 to-indigo-500 text-purple-300 border-purple-500/30'
                    : displayScore >= 80
                    ? 'from-emerald-500 to-teal-600 text-emerald-400 border-emerald-500/40'
                    : displayScore >= 60
                    ? 'from-amber-500 to-yellow-600 text-amber-400 border-amber-500/40'
                    : 'from-rose-500 to-red-600 text-rose-400 border-rose-500/40'
                const linkTo = isLive
                  ? reportReady || reportFailed
                    ? `/live/${i.id}/report`
                    : reportPending
                    ? `/live/${i.id}/report`
                    : `/live/${i.id}`
                  : i.status === 'COMPLETED'
                  ? `/interview/${i.id}/report`
                  : `/interview/${i.id}`

                return (
                  <motion.div key={`${i.kind}-${i.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                    <Link
                      href={linkTo}
                      className={`group block glass rounded-3xl border p-6 transition-all hover:-translate-y-1 relative overflow-hidden shadow-xl ${
                        isLive ? 'border-rose-500/25 hover:border-rose-500/60 hover:shadow-rose-500/10' : 'border-white/10 hover:border-purple-500/60 hover:shadow-purple-500/10'
                      }`}
                    >
                      <div className={`absolute -top-20 -right-20 h-40 w-40 rounded-full blur-3xl transition-colors pointer-events-none ${isLive ? 'bg-rose-500/10 group-hover:bg-rose-500/25' : 'bg-purple-500/10 group-hover:bg-purple-500/25'}`} />
                      
                      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 font-extrabold uppercase tracking-wider text-[10px]">
                                <Video className="h-3 w-3" /> Live Video Call
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 font-extrabold uppercase tracking-wider text-[10px]">
                                <FileText className="h-3 w-3" /> Text STAR Mock
                              </span>
                            )}
                            <span className="uppercase font-semibold text-neutral-400 text-[10px] tracking-wider">{i.type?.replace('_', ' ')}</span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSession(i, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/10 hover:text-rose-400 text-neutral-400"
                            title="Delete session permanently"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-1">
                          <h3 className={`text-xl font-extrabold tracking-tight transition-colors ${isLive ? 'text-white group-hover:text-rose-300' : 'text-white group-hover:text-purple-300'}`}>
                            {i.role}
                          </h3>
                          <p className="text-xs font-semibold text-neutral-400">{i.level} Level Candidate</p>
                        </div>

                        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                          <span className="text-neutral-400 flex items-center gap-1 font-medium">
                            <Clock className="h-3.5 w-3.5 text-neutral-500" />
                            {isLive ? new Date(i.createdAt).toLocaleDateString() : `${answered}/${total} answered`}
                          </span>

                          {reportReady ? (
                            <span className={`px-3 py-1 rounded-full border text-xs font-extrabold flex items-center gap-1.5 bg-black/40 shadow-md ${scoreColor}`}>
                              <Trophy className="h-3.5 w-3.5 shrink-0" /> {displayScore}/100
                            </span>
                          ) : reportPending ? (
                            <span className="rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 px-3 py-1 text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Generating Report
                            </span>
                          ) : reportFailed ? (
                            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 px-3 py-1 text-[11px] font-bold">No Transcript</span>
                          ) : isLive ? (
                            <span className="rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 text-[11px] font-bold">Active Call</span>
                          ) : (
                            <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 px-3 py-1 text-[11px] font-bold">In Progress</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Global Premium Footer */}
      <Footer />
    </main>
  )
}
