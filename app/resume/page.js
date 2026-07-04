'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Spotlight } from '@/components/aceternity/spotlight'
import ResumeSidebar from '@/components/mockmate/resume-sidebar'
import ATSScorePanel from '@/components/mockmate/ats-score-panel'
import ResumeDocEditor from '@/components/mockmate/resume-doc-editor'
import {
  Sparkles, Loader2, ArrowLeft, Upload, FileText, CheckCircle2, XCircle,
  AlertTriangle, Zap, Video, User, RefreshCw, Award, ShieldCheck, Download,
  Edit3, BookOpen, Code2, TrendingUp, Lightbulb, ArrowRight, LogOut,
} from 'lucide-react'

export default function ResumeAnalyzerPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [pending, startTransition] = useTransition()
  const [optimizing, setOptimizing] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)

  // Input states
  const [file, setFile] = useState(null)
  const [fileBase64, setFileBase64] = useState('')
  const [originalPdfBytes, setOriginalPdfBytes] = useState(null) // Raw ArrayBuffer for PDF editor
  const [mimeType, setMimeType] = useState('')
  const [fileName, setFileName] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [inputMode, setInputMode] = useState('upload')

  // Results & UI state
  const [analysis, setAnalysis] = useState(null)
  const [editableResumeText, setEditableResumeText] = useState('')
  const [activeSection, setActiveSection] = useState('ats')
  const [lastAppliedFixText, setLastAppliedFixText] = useState('')

  useEffect(() => {
    if (analysis?.extractedResumeText) {
      setEditableResumeText(analysis.extractedResumeText)
    }
  }, [analysis])

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    const MAX_SIZE = 2 * 1024 * 1024
    if (selected.size > MAX_SIZE) {
      toast.error('File size exceeds 2MB limit. Please upload a smaller PDF or DOCX file.')
      e.target.value = ''
      return
    }
    const allowedExtensions = ['.pdf', '.docx', '.doc']
    const fileNameLower = selected.name.toLowerCase()
    const isAllowedFormat = allowedExtensions.some(ext => fileNameLower.endsWith(ext)) ||
      ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'].includes(selected.type)
    if (!isAllowedFormat) {
      toast.error('Unsupported file format! Please upload a PDF, DOCX, or DOC file.')
      e.target.value = ''
      return
    }
    setFile(selected)
    setFileName(selected.name)
    setMimeType(selected.type || 'application/octet-stream')
    // Read as base64 for the API / iframe
    const reader = new FileReader()
    reader.onload = () => setFileBase64(reader.result)
    reader.readAsDataURL(selected)
    // Also read as ArrayBuffer for the PDF canvas editor
    if (selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf')) {
      const abReader = new FileReader()
      abReader.onload = () => setOriginalPdfBytes(abReader.result)
      abReader.readAsArrayBuffer(selected)
    }
  }

  const handleAnalyze = (e) => {
    e.preventDefault()
    if (!jobDescription.trim()) return toast.error('Please paste the target Job Description')
    if (inputMode === 'upload' && !fileBase64) return toast.error('Please select a resume file to upload')
    if (inputMode === 'text' && !resumeText.trim()) return toast.error('Please paste your resume text')
    startTransition(async () => {
      try {
        const res = await fetch('/api/resume/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: inputMode === 'upload' ? fileBase64 : undefined,
            mimeType: inputMode === 'upload' ? mimeType : undefined,
            fileName: inputMode === 'upload' ? fileName : 'Pasted Resume',
            resumeText: inputMode === 'text' ? resumeText : undefined,
            jobDescription,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Analysis failed')
        setAnalysis(data.analysis)
        toast.success('Rigorous ATS analysis complete!')
      } catch (err) {
        toast.error(err.message || 'Something went wrong during analysis.')
      }
    })
  }

  const handleReanalyze = async () => {
    if (!editableResumeText.trim()) return toast.error('Resume text cannot be empty')
    setReanalyzing(true)
    try {
      const res = await fetch('/api/resume/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: editableResumeText, fileName: fileName || 'Optimized Resume', jobDescription }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Re-analysis failed')
      const oldScore = analysis?.atsScore || 0
      const newScore = data.analysis?.atsScore || 0
      setAnalysis(data.analysis)
      if (newScore > oldScore) toast.success(`🎉 ATS Score jumped from ${oldScore}% to ${newScore}%!`)
      else toast.success(`Re-analyzed! Updated ATS Score: ${newScore}%`)
    } catch (err) {
      toast.error(err.message || 'Failed to re-analyze')
    } finally {
      setReanalyzing(false)
    }
  }

  const handleOptimize = async (action) => {
    if (!editableResumeText.trim()) return toast.error('Resume draft is empty')
    setOptimizing(true)
    try {
      const res = await fetch('/api/resume/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resumeText: editableResumeText, missingKeywords: analysis?.missingKeywords || [], jobDescription }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Optimization failed')
      setEditableResumeText(data.optimizedText)
      if (action === 'insert_keywords') toast.success('⚡ Missing keywords intelligently woven into your resume!')
      else toast.success('📄 Compiled & condensed to fit perfectly on 1 professional page!')
    } catch (err) {
      toast.error(err.message || 'Optimization failed')
    } finally {
      setOptimizing(false)
    }
  }

  const handleApplyFix = (action) => {
    if (!action) return
    const aiText = action.beforeAfter && action.beforeAfter.includes('After:')
      ? action.beforeAfter.split('After:')[1].trim()
      : (action.suggestion || '').trim()
    
    if (!aiText) return

    const weakText = action.beforeAfter && action.beforeAfter.includes('After:')
      ? action.beforeAfter.split('After:')[0].replace('Before:', '').trim()
      : (action.area || '').trim()

    // Helper: Calculate word overlap similarity
    const getWords = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2)
    const weakWords = getWords(weakText)

    const lines = editableResumeText.split('\n')
    let bestIdx = -1
    let bestScore = 0

    if (weakWords.length > 0) {
      lines.forEach((line, idx) => {
        const lineWords = getWords(line)
        if (lineWords.length === 0) return
        const matches = weakWords.filter(w => lineWords.includes(w)).length
        const score = matches / Math.max(weakWords.length, lineWords.length, 1)
        if (score > bestScore) {
          bestScore = score
          bestIdx = idx
        }
      })
    }

    if (bestIdx !== -1 && bestScore >= 0.25) {
      // In-place replacement of the best matching line!
      const originalLine = lines[bestIdx]
      const prefix = originalLine.trim().startsWith('-') || originalLine.trim().startsWith('*') ? '- ' : ''
      lines[bestIdx] = `${prefix}${aiText}`
      setEditableResumeText(lines.join('\n'))
      setLastAppliedFixText(aiText)
      toast.success('✨ Applied AI fix in place to your resume!')
    } else {
      // Section-aware insertion fallback: find closest matching heading (e.g. ## Work Experience or ## Skills)
      let sectionIdx = -1
      const targetAreaWords = getWords(action.area || 'Experience')
      
      lines.forEach((line, idx) => {
        if (line.startsWith('## ')) {
          const headingWords = getWords(line)
          const matches = targetAreaWords.filter(w => headingWords.includes(w)).length
          if (matches > 0 && sectionIdx === -1) {
            sectionIdx = idx
          }
        }
      })

      if (sectionIdx !== -1) {
        // Insert right under the matching section header
        lines.splice(sectionIdx + 1, 0, `- ${aiText}`)
        setEditableResumeText(lines.join('\n'))
        setLastAppliedFixText(aiText)
        toast.success(`✨ Inserted AI enhancement under section ${lines[sectionIdx].replace('## ', '')}!`)
      } else {
        // Fallback: append under experience or at end
        setEditableResumeText(editableResumeText + `\n- ${aiText}`)
        setLastAppliedFixText(aiText)
        toast.success('✨ AI suggestion added to resume!')
      }
    }
  }

  const wordCount = editableResumeText.trim() ? editableResumeText.trim().split(/\s+/).length : 0
  const isOnePage = wordCount <= 520

  // ─── UPLOAD FORM (pre-analysis) ───
  if (!analysis) {
    return (
      <main className="min-h-screen bg-black text-white relative overflow-hidden bg-grid-pattern pb-24">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20 pointer-events-none" fill="white" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black pointer-events-none" />
        <nav className="relative z-30 px-6 py-4 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-black/60 sticky top-0">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors font-medium">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2 font-bold tracking-tight text-base">
            <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" /> MockMate <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">Enterprise ATS Suite</span>
          </div>
          <div className="flex items-center gap-3">
            {session?.user && (
              <>
                <div className="flex items-center gap-2 text-sm text-neutral-300 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  {session.user.image ? <img src={session.user.image} alt="" className="h-5 w-5 rounded-full border border-white/20" /> : <User className="h-4 w-4 text-purple-400" />}
                  <span className="hidden md:inline font-medium text-xs">{session.user.name}</span>
                </div>
                <Button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-white/5 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-300 hover:border-rose-500/40 h-8 px-3 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
                  title="Sign out of MockMate"
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-400" />
                  <span>Sign Out</span>
                </Button>
              </>
            )}
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-6 py-10 relative z-10">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold text-purple-300 backdrop-blur-md shadow-lg shadow-purple-500/10">
                <ShieldCheck className="h-4 w-4 text-purple-400" /> Rigorous, Unbiased Enterprise ATS Evaluation
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
                AI Resume <span className="gradient-text">& ATS Optimization Suite</span>
              </h1>
              <p className="text-neutral-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                Experience objective ATS scoring with zero score inflation. Deeply analyze keyword gaps, edit with AI auto-completion, compile to 1-page optimal length, and get senior-level coursework and project recommendations.
              </p>
            </div>

            <form onSubmit={handleAnalyze} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Resume Upload */}
              <div className="glass rounded-3xl border border-white/10 p-7 space-y-5 flex flex-col justify-between relative overflow-hidden shadow-2xl">
                <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold tracking-wide uppercase text-neutral-300 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-400" /> 1. Candidate Resume
                    </Label>
                    <div className="flex bg-neutral-900/90 rounded-xl p-1 border border-white/10 text-xs font-semibold">
                      <button type="button" onClick={() => setInputMode('upload')} className={`px-3.5 py-1.5 rounded-lg transition-all ${inputMode === 'upload' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}>Upload File</button>
                      <button type="button" onClick={() => setInputMode('text')} className={`px-3.5 py-1.5 rounded-lg transition-all ${inputMode === 'text' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}>Paste Text</button>
                    </div>
                  </div>
                  {inputMode === 'upload' ? (
                    <div className="border-2 border-dashed border-white/15 hover:border-purple-500/60 transition-all rounded-2xl p-10 text-center bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer relative group flex flex-col items-center justify-center min-h-[260px]">
                      <input type="file" accept=".pdf,.docx,.doc" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                      <div className="h-14 w-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                        <Upload className="h-7 w-7 text-purple-400" />
                      </div>
                      {fileName ? (
                        <div className="space-y-1.5">
                          <p className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1.5"><CheckCircle2 className="h-4 w-4 shrink-0" /> {fileName}</p>
                          <p className="text-xs text-neutral-400 font-medium">Click or drag another file to replace</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-sm font-bold text-white">Click to upload or drag & drop</p>
                          <p className="text-xs text-purple-300 font-semibold">Supported formats: PDF, DOCX, DOC · Max size: 2MB</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <textarea placeholder="Paste your full resume text here..." value={resumeText} onChange={(e) => setResumeText(e.target.value)}
                      className="w-full h-[260px] rounded-2xl border border-white/10 bg-white/5 p-4 text-sm placeholder:text-neutral-500 focus:border-purple-500/60 focus:outline-none resize-none font-mono text-neutral-200" />
                  )}
                </div>
                <div className="pt-2 flex items-center justify-between text-xs text-neutral-400 border-t border-white/5">
                  <span>🔒 Multi-modal secure parsing</span><span>⚡ Powered by MockMate AI</span>
                </div>
              </div>

              {/* Job Description */}
              <div className="glass rounded-3xl border border-white/10 p-7 space-y-5 flex flex-col justify-between relative overflow-hidden shadow-2xl">
                <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />
                <div className="space-y-4 flex-1 flex flex-col relative z-10">
                  <Label className="text-sm font-bold tracking-wide uppercase text-neutral-300 flex items-center gap-2">
                    <Award className="h-4 w-4 text-pink-400" /> 2. Target Job Description
                  </Label>
                  <textarea placeholder="Paste the full job description..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} required
                    className="w-full flex-1 min-h-[260px] rounded-2xl border border-white/10 bg-white/5 p-4 text-sm placeholder:text-neutral-500 focus:border-pink-500/60 focus:outline-none resize-none font-mono text-neutral-200" />
                </div>
                <div className="pt-2 flex items-center justify-between text-xs text-neutral-400 border-t border-white/5">
                  <span>🎯 Rigorous keyword extraction</span><span>🚫 Zero score inflation</span>
                </div>
              </div>

              <div className="md:col-span-2 pt-2">
                <Button type="submit" disabled={pending || !jobDescription.trim() || (inputMode === 'upload' ? !fileBase64 : !resumeText.trim())}
                  className="w-full h-16 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-extrabold text-base md:text-lg rounded-2xl shadow-2xl shadow-purple-500/30 transition-all hover:scale-[1.01]">
                  {pending ? (
                    <span className="flex items-center justify-center gap-3"><Loader2 className="h-6 w-6 animate-spin" /> Deeply Analyzing Resume & Job Requirements...</span>
                  ) : (
                    <span className="flex items-center justify-center gap-3"><Zap className="h-6 w-6 fill-current" /> Run Deep ATS Scan & Generate Optimization Plan</span>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
    )
  }

  // ─── ANALYSIS RESULTS: 3-Panel Layout (Sidebar | ATS Panel | Document Editor) ───
  return (
    <main className="h-screen flex flex-col bg-[#070714] text-white overflow-hidden print:bg-white print:overflow-visible">
      {/* Slim top bar */}
      <div className="h-14 border-b border-white/10 bg-[#0a0a1a] flex items-center justify-between px-4 shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <span className="font-bold text-sm">MockMate</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">Enterprise ATS Suite</span>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => handleOptimize('insert_keywords')} disabled={optimizing || !analysis?.missingKeywords?.length} size="sm"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold h-8 px-3 rounded-lg text-[11px]">
            <Zap className="h-3 w-3 mr-1 text-yellow-300" /> Insert Keywords ({analysis?.missingKeywords?.length || 0})
          </Button>
          <Button onClick={handleReanalyze} disabled={reanalyzing} size="sm"
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 font-bold h-8 px-3 rounded-lg text-[11px]">
            {reanalyzing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />} Re-Analyze
          </Button>
          <Button onClick={() => setAnalysis(null)} size="sm" variant="outline" className="border-white/10 text-neutral-400 h-8 px-3 rounded-lg text-[11px]">
            New Scan
          </Button>
          <Button onClick={() => signOut({ callbackUrl: '/login' })} size="sm" variant="outline" className="border-white/10 bg-white/5 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-300 hover:border-rose-500/40 h-8 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1.5" title="Sign out">
            <LogOut className="h-3 w-3 text-rose-400" /> Sign Out
          </Button>
          {session?.user && (
            <div className="flex items-center gap-2 text-xs text-neutral-300 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              {session.user.image ? <img src={session.user.image} alt="" className="h-4 w-4 rounded-full" /> : <User className="h-3 w-3 text-purple-400" />}
              <span className="hidden md:inline text-[11px]">{session.user.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 overflow-hidden print:block">
        {/* Sidebar */}
        <ResumeSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onNewScan={() => setAnalysis(null)}
        />

        {/* ATS Score Panel (left) */}
        <ATSScorePanel
          analysis={analysis}
          onSwitchToEditor={() => setActiveSection('editor')}
          onApplyFix={handleApplyFix}
        />

        {/* Document Editor (right) */}
        <ResumeDocEditor
          editableText={editableResumeText}
          onTextChange={setEditableResumeText}
          analysis={analysis}
          isOnePage={isOnePage}
          wordCount={wordCount}
          onOptimize={handleOptimize}
          optimizing={optimizing}
          fileBase64={fileBase64}
          mimeType={mimeType}
          lastAppliedFixText={lastAppliedFixText}
          originalPdfBytes={originalPdfBytes}
        />
      </div>
    </main>
  )
}
