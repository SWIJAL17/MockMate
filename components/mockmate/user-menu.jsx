'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchCurrentUser, logout } from '@/lib/mockmate/session'
import { Sparkles, LogOut, User as UserIcon, CreditCard, LayoutDashboard, ChevronDown } from 'lucide-react'

export function UserMenu() {
  const [user, setUser] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchCurrentUser().then(setUser)
  }, [])

  useEffect(() => {
    const close = () => setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  if (!user) return null

  const initials = (user.name || user.email || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] pl-1 pr-3 py-1 transition-colors">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
          {initials}
        </div>
        <span className="text-sm hidden sm:block max-w-[120px] truncate">{user.name || user.email}</span>
        {user.plan === 'PRO' && <span className="text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-black px-1.5 py-0.5 rounded">PRO</span>}
        <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-neutral-950/95 backdrop-blur-md shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-sm font-semibold truncate">{user.name || 'You'}</p>
            <p className="text-xs text-neutral-400 truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5"><LayoutDashboard className="h-4 w-4 text-neutral-400" /> Dashboard</Link>
            <Link href="/pricing" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5"><CreditCard className="h-4 w-4 text-neutral-400" /> Billing &amp; Plans</Link>
            <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5 text-rose-300"><LogOut className="h-4 w-4" /> Log out</button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
