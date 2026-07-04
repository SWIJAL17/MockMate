'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Sparkles, Trash, Eye, ArrowRight } from 'lucide-react'

function ATSScoreDisplay({ score }) {
  const textColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'
  const bgBadge = score >= 80 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : score >= 60 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'
  const ratingText = score >= 80 ? 'Excellent · ATS Optimized' : score >= 60 ? 'Good · Needs Minor Fixes' : 'Needs Work · Low Compatibility'

  return (
    <div className="flex items-center justify-between bg-black/50 border border-white/10 rounded-2xl p-5 shadow-inner">
      <div className="space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Overall ATS Rating
        </span>
        <div className={`text-xs font-bold px-2.5 py-1 rounded-md border inline-block ${bgBadge}`}>
          {ratingText}
        </div>
      </div>
      <div className="flex items-baseline gap-1 text-right">
        <span className={`text-5xl font-black tracking-tight ${textColor}`}>{score}</span>
        <span className="text-lg font-bold text-neutral-400">/100</span>
      </div>
    </div>
  )
}

export default function ATSScorePanel({ analysis, onSwitchToEditor, onApplyFix }) {
  const [actionTab, setActionTab] = useState('pending')
  const [expandedIdx, setExpandedIdx] = useState(null)
  const [completedActions, setCompletedActions] = useState([])
  const [deletedActions, setDeletedActions] = useState([])

  if (!analysis) return null

  const allActions = analysis.improvements || []
  const pendingActions = allActions.filter((_, i) => !completedActions.includes(i) && !deletedActions.includes(i))
  const completedList = allActions.filter((_, i) => completedActions.includes(i))
  const deletedList = allActions.filter((_, i) => deletedActions.includes(i))

  const handleFix = (action, idx) => {
    if (onApplyFix) onApplyFix(action)
    setCompletedActions(prev => [...prev, idx])
  }

  const handleDelete = (idx) => {
    setDeletedActions(prev => [...prev, idx])
  }

  const displayActions = actionTab === 'pending' ? pendingActions
    : actionTab === 'completed' ? completedList
    : deletedList

  return (
    <div className="w-full lg:w-[420px] shrink-0 bg-[#0d0d1f] border-r border-white/10 p-6 overflow-y-auto space-y-6 print:hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 56px)' }}>
      {/* ATS Score Header */}
      <h2 className="text-xl font-extrabold text-white">ATS Score</h2>

      {/* Numeric ATS Score Display */}
      <div className="glass rounded-2xl border border-white/10 p-5 space-y-4">
        <ATSScoreDisplay score={analysis.atsScore || 0} />
        <div className={`p-3 rounded-xl text-sm font-semibold flex items-start gap-2 ${
          analysis.atsScore >= 80 ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
            : analysis.atsScore >= 60 ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300'
            : 'bg-red-500/10 border border-red-500/20 text-red-300'
        }`}>
          <span>{analysis.atsScore >= 80 ? '🎉' : '⚠️'}</span>
          <div>
            <p>{analysis.atsScore >= 80 ? "Nice work! Your resume is ATS-ready. Let's optimize it for the job you want." : "Your resume needs improvements to pass ATS filters effectively."}</p>
            <button onClick={onSwitchToEditor} className="text-purple-400 hover:text-purple-300 text-xs font-bold mt-1 flex items-center gap-1">
              Go to Optimize for Job <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Actions */}
      <div className="space-y-4 flex-1">
        <h3 className="text-base font-bold text-white">Suggested Actions</h3>

        {/* Tabs: Pending / Completed / Deleted */}
        <div className="flex gap-2 text-xs font-bold">
          {[
            { key: 'pending', label: 'Pending', count: pendingActions.length, color: 'purple' },
            { key: 'completed', label: 'Completed', count: completedList.length, color: 'emerald' },
            { key: 'deleted', label: 'Deleted', count: deletedList.length, color: 'red' },
          ].map(t => (
            <button key={t.key} onClick={() => setActionTab(t.key)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                actionTab === t.key ? `bg-${t.color}-500/20 text-${t.color}-400 border border-${t.color}-500/30` : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t.label}
              <span className={`h-5 w-5 rounded-full text-[10px] flex items-center justify-center ${
                actionTab === t.key ? `bg-${t.color}-500/30 text-${t.color}-300` : 'bg-white/10 text-neutral-500'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Action Cards */}
        <div className="space-y-3">
          {displayActions.length === 0 && (
            <p className="text-xs text-neutral-500 italic py-4 text-center">No actions in this category.</p>
          )}
          {displayActions.map((action, localIdx) => {
            const globalIdx = allActions.indexOf(action)
            const isExpanded = expandedIdx === globalIdx
            const isCompleted = completedActions.includes(globalIdx)
            return (
              <div key={globalIdx} className={`rounded-xl border p-4 space-y-3 transition-all ${
                isCompleted ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-yellow-500/20 bg-yellow-500/5'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${isCompleted ? 'text-emerald-400' : 'text-yellow-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${isCompleted ? 'text-emerald-300' : 'text-yellow-300'}`}>{action.area}</p>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{action.suggestion}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {!isCompleted && actionTab === 'pending' && (
                    <Button size="sm" onClick={() => handleFix(action, globalIdx)}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] h-7 px-3 rounded-lg font-bold flex items-center gap-1"
                    >
                      Fix <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                  <button onClick={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                    className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  {actionTab === 'pending' && (
                    <button onClick={() => handleDelete(globalIdx)}
                      className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-red-400 transition-colors"
                    >
                      <Trash className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Expanded Reason */}
                {isExpanded && (
                  <div className="mt-2 p-3 rounded-lg bg-black/40 border border-white/10 text-xs space-y-2">
                    <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">Reason</span>
                    {action.beforeAfter && (
                      <div className="space-y-2">
                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                          <span className="text-[10px] font-bold text-red-400">Before:</span>
                          <p className="text-neutral-300 font-mono text-[11px] mt-1">
                            {action.beforeAfter.includes('After:') ? action.beforeAfter.split('After:')[0].replace('Before:', '').trim() : action.beforeAfter}
                          </p>
                        </div>
                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-[10px] font-bold text-emerald-400">After:</span>
                          <p className="text-emerald-200 font-mono text-[11px] mt-1">
                            {action.beforeAfter.includes('After:') ? action.beforeAfter.split('After:')[1].trim() : 'Optimized'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
