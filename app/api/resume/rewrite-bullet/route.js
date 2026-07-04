import { NextResponse } from 'next/server';
import { MockmateGenAI as GoogleGenAI } from '@/lib/mockmate/ai-client';

export const runtime = 'nodejs';

/**
 * Commercial-Grade PDF Resume Editor — AI Bullet Rewrite Endpoint (Phase 14)
 * 
 * Rewrites single resume bullet points or paragraphs using Gemini.
 * Strictly respects character length limits and bounding box constraints
 * so the rewritten text fits cleanly into the original document layout.
 */
export async function POST(req) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set in environment variables.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { text, font, fontSize, maxChars = 150, targetKeywords = [], tone = 'professional' } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Valid text string is required.' }, { status: 400 });
    }

    const keywordsPrompt = targetKeywords.length > 0 
      ? `Ensure you naturally incorporate these ATS keywords if relevant: ${targetKeywords.join(', ')}.` 
      : '';

    const prompt = `You are an Elite Executive Resume Writer and Principal Recruiter at Google and McKinsey.
Rewrite the following resume bullet point to make it extremely powerful, quantified, action-oriented, and impactful using the STAR (Situation, Task, Action, Result) framework.

ORIGINAL TEXT: "${text}"

CRITICAL CONSTRAINTS:
1. Tone: ${tone} (executive, authoritative, and results-driven).
2. Maximum Length: Exactly ${maxChars} characters or fewer so it fits perfectly inside the original PDF bounding box without line overflow.
3. Typography: The font is ${font} at ${fontSize}pt. Ensure reading rhythm is punchy and scannable.
4. ${keywordsPrompt}
5. Do NOT include bullet symbols (•, -, *) at the beginning unless they were in the original text.
6. Return ONLY the plain rewritten text string with no quotation marks, no markdown formatting, and no conversational intro/outro.`;

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const response = await ai.models.generateContent({
      model,
      contents: [prompt],
    });

    let rewrittenText = response.text || '';
    rewrittenText = rewrittenText.replace(/^["']|["']$/g, '').trim();

    // Safety truncate if AI slightly exceeded character limit
    if (rewrittenText.length > maxChars + 20) {
      rewrittenText = rewrittenText.slice(0, maxChars).trim() + '.';
    }

    return NextResponse.json({
      originalText: text,
      rewrittenText,
      charCount: rewrittenText.length,
      maxChars,
    });
  } catch (err) {
    console.error('[API /rewrite-bullet] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate AI rewrite. Please try again.' },
      { status: 500 }
    );
  }
}
