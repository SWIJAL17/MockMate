'use client'

import Link from 'next/link'
import { Sparkles, ShieldCheck, Cpu, Lock, Heart, ArrowUpRight, Github, Twitter, Linkedin } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative z-30 border-t border-white/10 bg-black/80 backdrop-blur-2xl text-white overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 h-32 w-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 h-32 w-96 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
            <Link href="/dashboard" className="flex items-center gap-2 font-black text-xl tracking-tight">
              <Sparkles className="h-6 w-6 text-purple-400 animate-pulse" /> MockMate<span className="text-purple-400">.AI</span>
            </Link>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              The enterprise-grade AI career coaching platform. Practice technical & behavioral mock interviews with realistic AI evaluators and optimize your resume against rigorous ATS rules.
            </p>
            <div className="flex items-center gap-3 text-neutral-400">
              <button type="button" aria-label="GitHub" className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:text-white hover:border-purple-500/50 transition-colors cursor-pointer">
                <Github className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Twitter" className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:text-white hover:border-purple-500/50 transition-colors cursor-pointer">
                <Twitter className="h-4 w-4" />
              </button>
              <button type="button" aria-label="LinkedIn" className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:text-white hover:border-purple-500/50 transition-colors cursor-pointer">
                <Linkedin className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Col 2: Quick Command Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-neutral-300">
              Platform Launchpad
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-neutral-400">
              <li>
                <Link href="/dashboard" className="hover:text-purple-400 transition-colors flex items-center gap-1 group">
                  <span className="h-1 w-1 rounded-full bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" /> Command Center Dashboard
                </Link>
              </li>
              <li>
                <Link href="/resume" className="hover:text-emerald-400 transition-colors flex items-center gap-1 group">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" /> Resume ATS Analyzer & 1-Page Editor
                </Link>
              </li>
              <li>
                <Link href="/interview/new" className="hover:text-purple-400 transition-colors flex items-center gap-1 group">
                  <span className="h-1 w-1 rounded-full bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" /> AI Text Practice Interview
                </Link>
              </li>
              <li>
                <Link href="/live/new" className="hover:text-rose-400 transition-colors flex items-center gap-1 group">
                  <span className="h-1 w-1 rounded-full bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" /> Live Video Interview AI
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Enterprise Tech Stack */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-neutral-300">
              Powered by Next-Gen AI
            </h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span>MockMate Proprietary AI Engine</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                <span>Real-Time Conversational Video AI</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>PBKDF2 Web Crypto Standard (100k Iterations)</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>MongoDB Enterprise Atlas Storage</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Security & Privacy Guarantee */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-neutral-300">
              Security & Privacy
            </h4>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Lock className="h-4 w-4 shrink-0" /> 100% Private & Secure
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed font-normal">
                Your uploaded resumes, job applications, and interview transcripts are encrypted and never shared. We practice strict zero-data retention for training external AI models.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p className="font-medium">
            © {currentYear} MockMate.AI Platform. Crafted with precision for ambitious full-stack engineers and tech professionals.
          </p>
          <div className="flex items-center gap-6 font-semibold">
            <span className="hover:text-neutral-400 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-neutral-400 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-neutral-400 cursor-pointer transition-colors">Security Architecture</span>
            <span className="flex items-center gap-1 text-purple-400 font-bold">
              Status: All Systems Operational <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
