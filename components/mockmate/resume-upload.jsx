'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ResumeUpload({ onExtracted, accent = 'purple' }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState('')

  const handleFile = async (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5MB PDF')
    setUploading(true)
    setFileName(file.name)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/parse-resume', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to parse PDF')
      onExtracted?.(j.text || '')
      toast.success('Resume parsed — questions will be personalized')
    } catch (e) {
      toast.error(e.message)
      setFileName('')
    } finally { setUploading(false) }
  }

  const clear = () => { setFileName(''); if (inputRef.current) inputRef.current.value = '' }

  const c = accent === 'rose' ? 'rose' : 'purple'
  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        className={`inline-flex items-center gap-1.5 text-xs rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-${c}-500/50 px-3 py-1.5 transition-colors disabled:opacity-50`}>
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? 'Extracting…' : 'Upload PDF resume'}
      </button>
      {fileName && !uploading && (
        <span className="inline-flex items-center gap-1 text-xs text-neutral-400 rounded-full bg-white/[0.03] border border-white/10 px-2 py-1">
          <FileText className="h-3 w-3" /> {fileName.length > 24 ? fileName.slice(0, 22) + '…' : fileName}
          <button type="button" onClick={clear} className="hover:text-rose-400 ml-1"><X className="h-3 w-3" /></button>
        </span>
      )}
    </div>
  )
}
