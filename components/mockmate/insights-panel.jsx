'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, Radar as RadarIcon, PieChart as PieIcon, ThumbsUp, AlertTriangle, LineChart } from 'lucide-react'
import { computeAnalytics } from '@/lib/mockmate/analytics'

// Dark-theme tooltip shared across charts
function DarkTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/15 bg-neutral-950/95 px-3 py-2 shadow-xl backdrop-blur-md">
      {label != null && <p className="mb-1 text-[11px] font-bold text-neutral-300">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-semibold" style={{ color: p.color || p.payload?.fill || '#a78bfa' }}>
          {p.name}: <span className="font-black">{p.value}{suffix}</span>
        </p>
      ))}
    </div>
  )
}

function CardShell({ icon: Icon, title, subtitle, accent, children, className = '' }) {
  return (
    <div className={`glass rounded-3xl border border-white/10 p-6 relative overflow-hidden shadow-xl ${className}`}>
      <div className={`absolute -top-20 -right-20 h-40 w-40 rounded-full blur-3xl pointer-events-none ${accent}`} />
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-300 shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-white leading-none">{title}</h3>
            {subtitle && <p className="text-[11px] text-neutral-500 font-medium mt-1">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function InsightsPanel({ interviews = [] }) {
  const a = useMemo(() => computeAnalytics(interviews), [interviews])

  const hasData = a.completedCount > 0
  const hasTrend = a.scoreTrend.length > 0
  const hasRadar = a.radarData.some((d) => d.score > 0)
  const hasPie = a.pieData.length > 0

  // Empty state — nothing scored yet
  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-3xl border border-white/10 p-10 text-center relative overflow-hidden shadow-xl"
      >
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-md mx-auto space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <LineChart className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black tracking-tight">Performance insights unlock after your first result</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Complete a text mock or a live interview and we&apos;ll chart your score trend, break down your strongest
            interview types, and surface recurring strengths and weaknesses here.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Performance Insights</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Aggregated from {a.completedCount} scored {a.completedCount === 1 ? 'session' : 'sessions'} · average{' '}
            <span className="font-bold text-emerald-400">{a.avgScore}%</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score Trend — spans 2 cols on desktop */}
        <CardShell
          icon={TrendingUp}
          title="Score Trend"
          subtitle="Overall score across your sessions over time"
          accent="bg-emerald-500/10"
          className="lg:col-span-2"
        >
          {hasTrend ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={a.scoreTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<DarkTooltip suffix="/100" />} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Score"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#scoreFill)"
                    dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart label="No scored sessions yet to trend." />
          )}
        </CardShell>

        {/* Session Mix donut */}
        <CardShell icon={PieIcon} title="Session Mix" subtitle="Distribution by interview type" accent="bg-purple-500/10">
          {hasPie ? (
            <div className="h-56 w-full flex flex-col">
              <ResponsiveContainer width="100%" height="70%">
                <PieChart>
                  <Pie
                    data={a.pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {a.pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-2">
                {a.pieData.map((entry, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-300">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                    {entry.name} ({entry.value})
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart label="No sessions to break down." />
          )}
        </CardShell>

        {/* Skill Radar */}
        <CardShell icon={RadarIcon} title="Skill Radar" subtitle="Average score by interview type" accent="bg-cyan-500/10">
          {hasRadar ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={a.radarData} outerRadius="72%">
                  <PolarGrid stroke="rgba(255,255,255,0.12)" />
                  <PolarAngleAxis dataKey="type" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Avg score" dataKey="score" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.35} />
                  <Tooltip content={<DarkTooltip suffix="/100" />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart label="Complete more types to build your radar." />
          )}
        </CardShell>

        {/* Strengths & Weaknesses — spans 2 cols */}
        <CardShell
          icon={ThumbsUp}
          title="Recurring Strengths & Weaknesses"
          subtitle="Themes aggregated across your feedback reports"
          accent="bg-pink-500/10"
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ThemeList
              title="Strengths"
              icon={ThumbsUp}
              items={a.topStrengths}
              tone="emerald"
              empty="No strengths recorded yet."
            />
            <ThemeList
              title="Areas to improve"
              icon={AlertTriangle}
              items={a.topWeaknesses}
              tone="rose"
              empty="No weaknesses recorded yet — nice."
            />
          </div>
        </CardShell>
      </div>
    </motion.div>
  )
}

function EmptyChart({ label }) {
  return (
    <div className="h-56 w-full flex items-center justify-center">
      <p className="text-xs text-neutral-500 font-medium text-center px-4">{label}</p>
    </div>
  )
}

function ThemeList({ title, icon: Icon, items, tone, empty }) {
  const tones = {
    emerald: { text: 'text-emerald-400', dot: 'bg-emerald-400', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    rose: { text: 'text-rose-400', dot: 'bg-rose-400', chip: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  }
  const t = tones[tone] || tones.emerald
  return (
    <div className="space-y-2.5">
      <div className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${t.text}`}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-neutral-500 font-medium">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-xs text-neutral-300">
              <span className="flex items-center gap-2 min-w-0">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${t.dot}`} />
                <span className="truncate capitalize font-medium">{item.text}</span>
              </span>
              {item.count > 1 && (
                <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${t.chip}`}>
                  ×{item.count}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
