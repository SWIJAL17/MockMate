'use client'
import Link from 'next/link'
import { ArrowLeft, Edit3, TrendingUp, RefreshCw, FileText } from 'lucide-react'

export default function ResumeSidebar({ activeSection, onSectionChange, onNewScan }) {
  const navItems = [
    { icon: ArrowLeft, label: 'Dashboard', href: '/dashboard', id: 'back' },
    { icon: TrendingUp, label: 'ATS Score\n& Fixes', id: 'ats' },
    { icon: Edit3, label: 'Interactive\nEditor', id: 'editor' },
  ]

  return (
    <div className="w-[76px] shrink-0 bg-[#0a0a1a] border-r border-white/10 flex flex-col items-center py-5 gap-2 print:hidden">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = activeSection === item.id

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              className="w-full flex flex-col items-center gap-1.5 py-3 px-1 text-[10px] text-neutral-400 hover:text-white hover:bg-white/5 transition-all text-center leading-tight font-bold"
            >
              <Icon className="h-5 w-5 text-purple-400" />
              <span className="whitespace-pre-line">{item.label}</span>
            </Link>
          )
        }

        return (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`w-full flex flex-col items-center gap-1.5 py-3 px-1 text-[10px] transition-all text-center leading-tight font-bold ${
              isActive
                ? 'text-purple-400 bg-purple-500/15 border-l-2 border-purple-500'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="whitespace-pre-line">{item.label}</span>
          </button>
        )
      })}

      <div className="mt-auto w-full px-1">
        <button
          onClick={onNewScan}
          className="w-full flex flex-col items-center gap-1 py-3 px-1 text-[10px] text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-all text-center leading-tight font-bold border border-white/10"
          title="Upload new resume"
        >
          <RefreshCw className="h-4 w-4 text-emerald-400" />
          <span>New Scan</span>
        </button>
      </div>
    </div>
  )
}
