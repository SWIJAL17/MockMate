// Compute dashboard analytics from interview + live session data

export function computeAnalytics(interviews) {
  const completed = interviews.filter(i =>
    i.kind === 'LIVE' ? i.reportStatus === 'READY' : i.status === 'COMPLETED'
  )
  const totalCount = interviews.length
  const completedCount = completed.length
  const scores = completed.map(i => i.overall ?? 0).filter(s => s > 0)
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const bestInterview = completed.reduce((best, i) => (!best || (i.overall ?? 0) > (best.overall ?? 0)) ? i : best, null)
  const completionRate = totalCount ? Math.round((completedCount / totalCount) * 100) : 0

  // Score trend (chronological)
  const scoreTrend = completed
    .filter(i => (i.overall ?? 0) > 0)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(i => ({
      date: new Date(i.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: i.overall ?? 0,
      kind: i.kind,
      role: i.role,
    }))

  // Per-type averages for radar
  const typeMap = {}
  completed.forEach(i => {
    const t = i.type || 'MIXED'
    if (!typeMap[t]) typeMap[t] = []
    typeMap[t].push(i.overall ?? 0)
  })
  const TYPE_LABELS = { TECHNICAL: 'Technical', BEHAVIORAL: 'Behavioral', SYSTEM_DESIGN: 'System Design', HR: 'HR', MIXED: 'Mixed' }
  const radarData = Object.entries(TYPE_LABELS).map(([key, label]) => ({
    type: label,
    score: typeMap[key]?.length ? Math.round(typeMap[key].reduce((a, b) => a + b, 0) / typeMap[key].length) : 0,
  }))

  // Type distribution for pie
  const typeCounts = {}
  interviews.forEach(i => {
    const t = i.type || 'MIXED'
    typeCounts[t] = (typeCounts[t] || 0) + 1
  })
  const TYPE_COLORS = { TECHNICAL: '#a78bfa', BEHAVIORAL: '#ec4899', SYSTEM_DESIGN: '#3b82f6', HR: '#f59e0b', MIXED: '#10b981' }
  const pieData = Object.entries(typeCounts).map(([key, count]) => ({
    name: TYPE_LABELS[key] || key,
    value: count,
    fill: TYPE_COLORS[key] || '#8b5cf6',
  }))

  // Aggregate strengths & weaknesses
  const strengthMap = {}
  const weaknessMap = {}
  completed.forEach(i => {
    ;(i.strengths || []).forEach(s => {
      const k = s.toLowerCase().trim().slice(0, 80)
      if (k) strengthMap[k] = (strengthMap[k] || 0) + 1
    })
    ;(i.weaknesses || []).forEach(w => {
      const k = w.toLowerCase().trim().slice(0, 80)
      if (k) weaknessMap[k] = (weaknessMap[k] || 0) + 1
    })
  })
  const topStrengths = Object.entries(strengthMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([text, count]) => ({ text, count }))
  const topWeaknesses = Object.entries(weaknessMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([text, count]) => ({ text, count }))

  return {
    totalCount, completedCount, avgScore, bestInterview, completionRate,
    scoreTrend, radarData, pieData, topStrengths, topWeaknesses,
  }
}
