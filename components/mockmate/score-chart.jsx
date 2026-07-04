'use client'

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'
import { TrendingUp, Award, Target, Activity } from 'lucide-react'

export function ScoreChart({ items }) {
  // Extract scored items only, sorted oldest -> newest
  const scored = (items || [])
    .filter(i => typeof i.overall === 'number' && (i.kind === 'TEXT' ? i.status === 'COMPLETED' : i.reportStatus === 'READY'))
    .map(i => ({
      date: new Date(i.createdAt),
      score: i.overall,
      role: i.role,
      kind: i.kind,
    }))
    .sort((a, b) => a.date - b.date)

  if (scored.length === 0) return null

  const chartData = scored.map((s, i) => ({
    idx: i + 1,
    date: s.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: s.score,
    role: s.role,
    kind: s.kind,
  }))

  const avg = Math.round(chartData.reduce((a, b) => a + b.score, 0) / chartData.length)
  const best = Math.max(...chartData.map(d => d.score))
  const latest = chartData[chartData.length - 1].score
  const trend = chartData.length >= 2 ? chartData[chartData.length - 1].score - chartData[0].score : 0

  return (
    <div className="glass rounded-2xl border border-white/10 p-6 mb-8 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs mb-2">
              <Activity className="h-3.5 w-3.5 text-emerald-400" /> <span className="gradient-text font-medium">ANALYTICS</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold">Your progress</h3>
            <p className="text-neutral-400 text-sm mt-1">{scored.length} interview{scored.length === 1 ? '' : 's'} scored</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 min-w-[80px]">
              <div className="text-xs text-neutral-500 flex items-center gap-1"><Target className="h-3 w-3" /> Latest</div>
              <div className="text-2xl font-bold gradient-text">{latest}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 min-w-[80px]">
              <div className="text-xs text-neutral-500 flex items-center gap-1"><Award className="h-3 w-3" /> Best</div>
              <div className="text-2xl font-bold text-emerald-400">{best}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 min-w-[80px]">
              <div className="text-xs text-neutral-500 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Trend</div>
              <div className={`text-2xl font-bold ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{trend >= 0 ? '+' : ''}{trend}</div>
            </div>
          </div>
        </div>

        <div className="h-56 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="#666" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#888' }} formatter={(v, k, p) => [`${v}/100`, p.payload.role]} />
              <ReferenceLine y={avg} stroke="#666" strokeDasharray="3 3" label={{ value: `avg ${avg}`, fill: '#888', fontSize: 10, position: 'right' }} />
              <Line type="monotone" dataKey="score" stroke="url(#scoreGrad)" strokeWidth={3}
                dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#ec4899' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
