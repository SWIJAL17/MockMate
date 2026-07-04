import { NextResponse } from 'next/server'
import { MockmateGenAI as GoogleGenAI } from '@/lib/mockmate/ai-client'
import { auth } from '@/auth'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

/**
 * Surgical AI text rewrite endpoint.
 * Receives only a single text snippet + action, returns rewritten text.
 * Never receives the full PDF.
 */
export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text, action } = await request.json()
    if (!text || !action) {
      return NextResponse.json({ error: 'text and action are required' }, { status: 400 })
    }

    const actionPrompts = {
      improve: `You are a senior resume writing expert. Improve the following resume text to be more impactful, quantified, and ATS-optimized. Keep the same general meaning but make it significantly stronger. Return ONLY the improved text, nothing else:\n\n"${text}"`,
      rewrite: `You are a senior resume writing expert. Completely rewrite the following resume text with stronger action verbs, quantified achievements, and professional language. Return ONLY the rewritten text, nothing else:\n\n"${text}"`,
      shorten: `You are a concise resume editor. Shorten the following resume text while preserving the key information and impact. Make it 30-50% shorter. Return ONLY the shortened text, nothing else:\n\n"${text}"`,
      fix_grammar: `You are a professional editor. Fix any grammar, spelling, or punctuation errors in the following text. Keep the meaning identical. Return ONLY the corrected text, nothing else:\n\n"${text}"`,
    }

    const prompt = actionPrompts[action] || actionPrompts.improve

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
    const response = await ai.models.generateContent({
      model,
      contents: [prompt],
    })

    let rewrittenText = (response.text || '').trim()
    // Strip any quotes the model may have wrapped around the response
    rewrittenText = rewrittenText.replace(/^["']|["']$/g, '')

    return NextResponse.json({ rewrittenText })
  } catch (err) {
    console.error('AI rewrite error:', err)
    return NextResponse.json(
      { error: err.message || 'AI rewrite failed' },
      { status: 500 }
    )
  }
}
