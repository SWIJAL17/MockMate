'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, Play, Pause, Sparkles } from 'lucide-react'

const AVATAR_IMG = 'https://images.pexels.com/photos/13188831/pexels-photo-13188831.jpeg'

/**
 * AI Interviewer avatar card.
 * - Speaks the given `text` using the browser's SpeechSynthesis (free, no API key)
 * - Shows an animated audio waveform when speaking
 * - Auto-plays new questions once, and remembers what was already spoken
 */
export function AvatarInterviewer({ text, autoPlay = true, name = 'Alexa', title = 'Senior Interviewer' }) {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)
  const [voice, setVoice] = useState(null)
  const spokenRef = useRef('')
  const utteranceRef = useRef(null)

  // pick the best available voice once available
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false); return
    }
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices.length) return
      // Preference order: Google US English Female > any en-US female > any en-US > first voice
      const preferred =
        voices.find(v => /Google.*(US English|en-US)/i.test(v.name) && /female/i.test(v.name)) ||
        voices.find(v => v.lang === 'en-US' && /female|samantha|zira|jenny/i.test(v.name)) ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang && v.lang.startsWith('en')) ||
        voices[0]
      setVoice(preferred)
    }
    pickVoice()
    window.speechSynthesis.onvoiceschanged = pickVoice
    return () => { try { window.speechSynthesis.cancel() } catch {} }
  }, [])

  const speak = (t) => {
    if (!supported || !t) return
    try { window.speechSynthesis.cancel() } catch {}
    const u = new SpeechSynthesisUtterance(t)
    if (voice) u.voice = voice
    u.rate = 0.98
    u.pitch = 1.05
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    utteranceRef.current = u
    window.speechSynthesis.speak(u)
  }

  const stop = () => {
    try { window.speechSynthesis.cancel() } catch {}
    setSpeaking(false)
  }

  // Auto-play whenever a new question arrives
  useEffect(() => {
    if (!autoPlay || !text) return
    if (spokenRef.current === text) return
    spokenRef.current = text
    // small delay so voices list can populate
    const t = setTimeout(() => speak(text), 400)
    return () => clearTimeout(t)
     
  }, [text, voice])

  return (
    <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 md:p-6 overflow-hidden">
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-pink-500/10 blur-3xl" />

      <div className="relative flex items-center gap-4 md:gap-5">
        {/* Avatar with animated ring */}
        <div className="relative shrink-0">
          <motion.div
            animate={speaking ? { scale: [1, 1.06, 1], opacity: [0.6, 1, 0.6] } : { scale: 1, opacity: 0.4 }}
            transition={{ duration: 1.4, repeat: speaking ? Infinity : 0, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 blur-md"
          />
          <div className={`relative h-16 w-16 md:h-20 md:w-20 rounded-full overflow-hidden border-2 ${speaking ? 'border-purple-400' : 'border-white/20'} transition-colors shadow-xl shadow-purple-500/20`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR_IMG} alt="AI Interviewer" className="h-full w-full object-cover" />
            <AnimatePresence>
              {speaking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-purple-500/20 backdrop-blur-[1px] flex items-center justify-center">
                  <Volume2 className="h-6 w-6 text-white drop-shadow-lg" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Live pulse dot */}
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          </div>
        </div>

        {/* Name + status + waveform */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">{name}</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] uppercase tracking-wider px-2 py-0.5 font-semibold">
              <Sparkles className="h-3 w-3" /> AI
            </span>
          </div>
          <p className="text-xs text-neutral-400 mb-3">{title} · MockMate</p>

          {/* waveform bars */}
          <div className="flex items-end gap-1 h-6">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.span
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-purple-500 to-pink-400"
                animate={speaking
                  ? { height: [`${20 + Math.random() * 20}%`, `${60 + Math.random() * 40}%`, `${20 + Math.random() * 20}%`] }
                  : { height: '15%' }
                }
                transition={{ duration: 0.5 + Math.random() * 0.4, repeat: speaking ? Infinity : 0, ease: 'easeInOut', delay: i * 0.03 }}
              />
            ))}
          </div>
        </div>

        {/* Play/Stop control */}
        <button
          onClick={() => (speaking ? stop() : speak(text))}
          disabled={!supported || !text}
          className="shrink-0 h-11 w-11 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-40"
          title={speaking ? 'Stop' : 'Replay question'}
        >
          {speaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
      </div>

      {!supported && (
        <p className="relative mt-3 text-xs text-amber-400">Your browser doesn't support speech synthesis. Reading questions silently.</p>
      )}
    </div>
  )
}

/**
 * VoiceInputButton — dictates spoken words into a text field via Web Speech API STT.
 * onTranscript is called with the appended transcript each time recognition returns a result.
 */
export function VoiceInputButton({ onAppendTranscript }) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
      }
      if (finalText.trim()) onAppendTranscript?.(finalText.trim())
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec
    return () => { try { rec.stop() } catch {} }
  }, [onAppendTranscript])

  const toggle = () => {
    if (!supported) return
    if (listening) { try { recRef.current?.stop() } catch {}; setListening(false); return }
    try { recRef.current?.start(); setListening(true) } catch {}
  }

  if (!supported) return null

  return (
    <button type="button" onClick={toggle}
      className={`h-11 w-11 rounded-full border flex items-center justify-center transition-all shrink-0 ${
        listening
          ? 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-lg shadow-rose-500/30 animate-pulse'
          : 'border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300'
      }`}
      title={listening ? 'Stop recording' : 'Speak your answer'}
    >
      <Mic className="h-4 w-4" />
    </button>
  )
}
